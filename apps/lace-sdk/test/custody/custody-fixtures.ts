import { Cardano, Milliseconds, Serialization } from '@cardano-sdk/core';
import {
  Ed25519PrivateKey,
  Hash28ByteBase16,
  ready,
} from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { ActivityType } from '@lace-contract/activities';
import {
  applyInFlightUtxoAdjustments,
  cardanoContextActions,
  cardanoCustodyActions,
  CardanoNetworkId,
  CardanoPaymentAddress,
  classifyCardanoCustodyAccount,
  isCardanoCustodyAccount,
} from '@lace-contract/cardano-context';
import { CURRENT_CUSTODY_CONTRACT_VERSION } from '@lace-lib/cardano-custody';
import { BehaviorSubject, combineLatest, map, Subject } from 'rxjs';
import { vi } from 'vitest';

// Test-only imports of the custody transactions the signer tests sign; no
// test code enters the SDK.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  controlOutput,
  creation,
  DEVICE_0,
  deviceRewrite,
  EXPIRY,
  fundUtxo,
  grantedState,
  grantOutput,
  grantUtxo,
  identity,
  initialState,
  issueGrant,
  logicRun,
  PARKED_SCRIPTS,
  payout,
  PREPROD,
  record,
  serializeCustodyTransaction,
  sweepGrants,
  TESTNET_CUSTODY_XPUB,
  utxo,
  VALID_UNTIL,
} from '../../../../packages/contract/cardano-context/test/signing/custody-sign-request.fixtures';
import { vkeyWitnessSetOf } from '../../src/custody/cardano-custody-witnesses';

// eslint-disable-next-line @nx/enforce-module-boundaries
import type { CustodyTransactionShape } from '../../../../packages/contract/cardano-context/test/signing/custody-sign-request.fixtures';
import type { WalletWithCardanoCustody } from '../../src/custody/cardano-custody-wallet';
import type { requestCardanoCustodyBuild } from '../../src/custody/request-cardano-custody-build';
import type { EraSummary } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type {
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
  CardanoCustodyCreatorIndexProbeError,
  CardanoCustodyCreatorIndexProbeRequest,
  CardanoCustodyCreatorIndexProbeResult,
  CardanoCustodyDeviceBinding,
  CardanoTransactionHistoryItem,
  CardanoVkeyWitness,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { CustodyGrant } from '@lace-lib/cardano-custody';

type CardanoCustodyBuildOutcome = Awaited<
  ReturnType<typeof requestCardanoCustodyBuild>
>;

// eslint-disable-next-line @nx/enforce-module-boundaries
export {
  controlOutput,
  DEVICE_0,
  DEVICE_1,
  EXPIRY,
  fundUtxo,
  GRANT_LOVELACE,
  grantedState,
  grantOutput,
  grantUtxo,
  identity,
  initialState,
  LOGIC_REWARD_ACCOUNT,
  payout,
  PREPROD,
  record,
  revokedState,
  serializeResolvedInput,
  TESTNET_CUSTODY_XPUB,
  utxo,
  VALID_UNTIL,
} from '../../../../packages/contract/cardano-context/test/signing/custody-sign-request.fixtures';
// eslint-disable-next-line @nx/enforce-module-boundaries
export { words } from '../../../../packages/contract/cardano-context/test/signing/sign-with-words.fixtures';

/** A raw Ed25519 key, as a fee sponsor or an agent's wallet holds one. */
export const signingKey = (seed: number) => {
  const privateKey = Ed25519PrivateKey.fromNormalBytes(
    new Uint8Array(32).fill(seed),
  );
  const publicKey = privateKey.toPublic();
  return {
    keyHash: publicKey.hash().hex(),
    witnessOver: (bodyHash: Cardano.TransactionId): CardanoVkeyWitness => ({
      vkey: publicKey.hex(),
      signature: privateKey.sign(HexBlob(bodyHash)).hex(),
    }),
  };
};

await ready();
export const sponsorKey = signingKey(0x51);
export const agentKey = signingKey(0x61);
export const otherAgentKey = signingKey(0x62);
export const strangerKey = signingKey(0x71);

const enterpriseAddress = (keyHash: string) =>
  Cardano.EnterpriseAddress.fromCredentials(Cardano.NetworkId.Testnet, {
    type: Cardano.CredentialType.KeyHash,
    hash: Hash28ByteBase16(keyHash),
  })
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

export const SPONSOR_ADDRESS = enterpriseAddress(sponsorKey.keyHash);
export const RECIPIENT_ADDRESS = enterpriseAddress('ab'.repeat(28));

export const sponsorFee = utxo(0xf0, payout(5_000_000n, SPONSOR_ADDRESS));
export const sponsorCollateral = utxo(
  0xf1,
  payout(5_000_000n, SPONSOR_ADDRESS),
);

const collateralMode = {
  collaterals: [sponsorCollateral],
  collateralReturn: payout(4_625_000n, SPONSOR_ADDRESS),
  totalCollateral: 375_000n,
};

/** The grant the fixture agent key holds, in slot 0. */
export const agentGrant: CustodyGrant = {
  slot: 0n,
  grantee: HexBlob(agentKey.keyHash),
  generation: 0n,
  scope: {
    asset: { policyId: HexBlob(''), assetName: HexBlob('') },
    perCallCap: 10_000_000n,
    cap: 15_000_000n,
    lovelacePerCallCap: 0n,
    lovelaceCap: 0n,
    expiresAt: EXPIRY,
    recipients: [],
  },
};

/** The sponsor's fee mode: its leased UTxO pays the fee, deposit and control output. */
export const creationShape = (): CustodyTransactionShape => ({
  ...creation(),
  inputs: [sponsorFee],
  outputs: [
    controlOutput(initialState, 1_500_000n),
    payout(1_250_000n, SPONSOR_ADDRESS),
  ],
  ...collateralMode,
});

export const liveControl = utxo(0x10, controlOutput(initialState));
export const grantedControl = utxo(0x10, controlOutput(grantedState));
export const agentGrantUtxo = grantUtxo(agentGrant);

/**
 * The sponsor's collateral mode, on this sponsor's collateral: a fund UTxO
 * pays the fee of issuing `agentGrant`.
 */
export const issueGrantShape = (): CustodyTransactionShape => ({
  ...issueGrant({ grant: agentGrant }),
  ...collateralMode,
});

/** Pays 2 tADA to the recipient from the fund UTxO, the rest returning as change. */
export const ownerSpendShape = (): CustodyTransactionShape => ({
  ...deviceRewrite(initialState),
  outputs: [
    controlOutput(initialState),
    payout(2_000_000n, RECIPIENT_ADDRESS),
    payout(7_750_000n, identity.address),
  ],
  ...collateralMode,
});

/** Removes the revoked `agentGrant`, its lovelace kept in the control output. */
export const sweepGrantShape = (): CustodyTransactionShape => ({
  ...sweepGrants({ grants: [agentGrant] }),
  ...collateralMode,
});

const GRANT_SPEND_PAYOUT = 2_000_000n;
const FEE = 250_000n;

/**
 * A spend under the agent grant: it references the control UTxO and the
 * parked contract scripts, runs the account's logic, spends the grant UTxO
 * and a fund UTxO, and recreates the grant with its cap lowered by the
 * payout and the fee.
 */
export const grantSpendShape = (): CustodyTransactionShape => {
  const leaving = GRANT_SPEND_PAYOUT + FEE;
  return {
    inputs: [agentGrantUtxo, fundUtxo],
    referenceInputs: [grantedControl, ...PARKED_SCRIPTS],
    spendRedeemers: [
      { spent: agentGrantUtxo, redeemer: { kind: 'spendWithGrant' } },
      { spent: fundUtxo, redeemer: { kind: 'fund' } },
    ],
    outputs: [
      grantOutput({
        ...agentGrant,
        scope: { ...agentGrant.scope, cap: agentGrant.scope.cap - leaving },
      }),
      payout(GRANT_SPEND_PAYOUT, RECIPIENT_ADDRESS),
      payout(fundUtxo[1].value.coins - leaving, identity.address),
    ],
    withdrawals: [logicRun()],
    ...collateralMode,
    requiredSigners: [agentKey.keyHash],
  };
};

export const transactionOf = (shape: CustodyTransactionShape) =>
  Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(serializeCustodyTransaction(shape)),
  );

/** What the build side effect answers for a shape. */
export const buildResultOf = (
  shape: CustodyTransactionShape,
  extra: Partial<CardanoCustodyBuildResult> = {},
): CardanoCustodyBuildResult => {
  const transaction = transactionOf(shape);
  return {
    transaction: transaction.toCbor(),
    bodyHash: transaction.getId(),
    resolvedInputs: [
      ...shape.inputs,
      ...(shape.referenceInputs ?? []),
      ...(shape.collaterals ?? []),
    ],
    accountRecord: record,
    fee: FEE,
    invalidHereafter: VALID_UNTIL,
    ...extra,
  };
};

export const creationResult = () =>
  buildResultOf(creationShape(), {
    creation: {
      creatorIndex: 0,
      identity: {
        chainId: PREPROD,
        accountValidatorHash:
          CURRENT_CUSTODY_CONTRACT_VERSION.accountValidatorHash,
        creatorKeyHash: identity.creatorKeyHash,
        stakeScriptHash: identity.stakeScriptHash,
        address: identity.address,
        rewardAccount: identity.rewardAccount,
      },
    },
  });

export const sponsorWitnessSetFor = (
  bodyHash: Cardano.TransactionId,
  key = sponsorKey,
) => vkeyWitnessSetOf([key.witnessOver(bodyHash)]);

export const hostedChannel = {
  type: 'hosted',
  origin: 'https://signer.example',
} as const;

export const localChannel = {
  type: 'local',
  credentialId: 'AQID',
  rpId: 'localhost',
} as const;

export const creatorBinding = (
  channel: CardanoCustodyDeviceBinding['channel'] = hostedChannel,
): CardanoCustodyDeviceBinding => ({
  extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
  index: 0,
  keyHash: DEVICE_0,
  channel,
});

/** The Preprod parameters custody classification reads. */
const PREPROD_PROTOCOL_PARAMETERS = {
  coinsPerUtxoByte: 4310,
} as RequiredProtocolParameters;

/** The Preprod era history from its Shelley start, enough for custody slots. */
export const preprodEraSummaries: EraSummary[] = [
  {
    parameters: { epochLength: 432_000, slotLength: Milliseconds(1000) },
    start: { slot: 86_400, time: new Date(1_655_769_600_000) },
  },
];

type SubmitAnswer = 'ok' | 'silent' | { error: string };

/**
 * A wallet whose store holds wallets, settled UTxOs and activities, and
 * whose Cardano module answers builds and submissions as each test says.
 * Custody account states are classified from the settled UTxOs with the
 * pending activities applied, as the real selector does.
 */
export const createCustodyTestWallet = () => {
  const wallets$ = new BehaviorSubject<AnyWallet[]>([]);
  const settledUtxos$ = new BehaviorSubject<Record<AccountId, Cardano.Utxo[]>>(
    {},
  );
  const activities$ = new BehaviorSubject<Record<AccountId, Activity[]>>({});
  const history$ = new BehaviorSubject<
    Record<AccountId, CardanoTransactionHistoryItem[]>
  >({});
  const tip$ = new BehaviorSubject<Cardano.Tip | undefined>(undefined);
  const chainId$ = new BehaviorSubject<Cardano.ChainId | undefined>(PREPROD);
  const networkInfo$ = new BehaviorSubject<
    Partial<
      Record<
        CardanoNetworkId,
        { protocolParameters?: RequiredProtocolParameters }
      >
    >
  >({
    [CardanoNetworkId(PREPROD.networkMagic)]: {
      protocolParameters: PREPROD_PROTOCOL_PARAMETERS,
    },
  });
  const eraSummaries$ = new BehaviorSubject<EraSummary[] | undefined>(
    preprodEraSummaries,
  );

  const buildCompleted$ = new Subject<
    ReturnType<
      typeof cardanoCustodyActions.cardanoCustody.buildCustodyTransactionCompleted
    >
  >();
  const buildFailed$ = new Subject<
    ReturnType<
      typeof cardanoCustodyActions.cardanoCustody.buildCustodyTransactionFailed
    >
  >();
  const probeCompleted$ = new Subject<
    ReturnType<
      typeof cardanoCustodyActions.cardanoCustody.probeCustodyCreatorIndexCompleted
    >
  >();
  const probeFailed$ = new Subject<
    ReturnType<
      typeof cardanoCustodyActions.cardanoCustody.probeCustodyCreatorIndexFailed
    >
  >();
  const submitCompleted$ = new Subject<
    ReturnType<typeof cardanoContextActions.cardanoContext.submitTxCompleted>
  >();
  const submitFailed$ = new Subject<
    ReturnType<typeof cardanoContextActions.cardanoContext.submitTxFailed>
  >();

  const builds: CardanoCustodyBuildRequest[] = [];
  const probes: CardanoCustodyCreatorIndexProbeRequest[] = [];
  const submitted: string[] = [];
  const control = {
    answerBuild: (
      _request: CardanoCustodyBuildRequest,
    ): CardanoCustodyBuildOutcome => ({
      ok: false,
      error: { code: 'unavailable', message: 'no build answer set' },
    }),
    answerProbe: (
      _request: CardanoCustodyCreatorIndexProbeRequest,
    ):
      | { ok: false; error: CardanoCustodyCreatorIndexProbeError }
      | { ok: true; result: CardanoCustodyCreatorIndexProbeResult } => ({
      ok: false,
      error: { code: 'unavailable', message: 'no probe answer set' },
    }),
    answerSubmit: (): SubmitAnswer => 'ok',
  };

  const custodyAccounts = () =>
    wallets$.value
      .flatMap(wallet => wallet.accounts as AnyAccount[])
      .filter(isCardanoCustodyAccount);

  const accountState$ = combineLatest([
    wallets$,
    settledUtxos$,
    activities$,
    networkInfo$,
  ]).pipe(
    map(([, settled, activities, networkInfo]) => (accountId: AccountId) => {
      const account = custodyAccounts().find(
        candidate => candidate.accountId === accountId,
      );
      if (!account) return undefined;
      const { address, chainId } = account.blockchainSpecific;
      const { protocolParameters } =
        networkInfo[CardanoNetworkId(chainId.networkMagic)] ?? {};
      if (!protocolParameters) return undefined;
      return classifyCardanoCustodyAccount({
        account: account.blockchainSpecific,
        utxos: applyInFlightUtxoAdjustments(
          settled[accountId] ?? [],
          [CardanoPaymentAddress(address)],
          activities[accountId] ?? [],
        ),
        withdrawableRewards: 0n,
        protocolParameters,
      });
    }),
  );

  const settledAccountState$ = combineLatest([
    wallets$,
    settledUtxos$,
    networkInfo$,
  ]).pipe(
    map(([, settled, networkInfo]) => (accountId: AccountId) => {
      const account = custodyAccounts().find(
        candidate => candidate.accountId === accountId,
      );
      if (!account || !settled[accountId]) return undefined;
      const { protocolParameters } =
        networkInfo[
          CardanoNetworkId(account.blockchainSpecific.chainId.networkMagic)
        ] ?? {};
      return (
        protocolParameters &&
        classifyCardanoCustodyAccount({
          account: account.blockchainSpecific,
          utxos: settled[accountId],
          withdrawableRewards: 0n,
          protocolParameters,
        })
      );
    }),
  );

  const { cardanoContext: actions } = cardanoContextActions;
  const { cardanoCustody: custodyActions } = cardanoCustodyActions;
  const dispatch = vi.fn((key: string, ...args: unknown[]) => {
    switch (key) {
      case 'cardanoCustody.buildCustodyTransaction': {
        const request = args[0] as CardanoCustodyBuildRequest;
        builds.push(request);
        // The build reads the era summaries in the store, as the module does.
        const outcome: CardanoCustodyBuildOutcome = eraSummaries$.value?.length
          ? control.answerBuild(request)
          : {
              ok: false,
              error: {
                code: 'unavailable',
                message: 'Cardano era summaries not available',
              },
            };
        if (outcome.ok) {
          buildCompleted$.next(
            custodyActions.buildCustodyTransactionCompleted({
              requestId: request.requestId,
              result: outcome.result,
            }),
          );
        } else {
          buildFailed$.next(
            custodyActions.buildCustodyTransactionFailed({
              requestId: request.requestId,
              error: outcome.error,
            }),
          );
        }
        return;
      }
      case 'cardanoCustody.probeCustodyCreatorIndex': {
        const request = args[0] as CardanoCustodyCreatorIndexProbeRequest;
        probes.push(request);
        const outcome = control.answerProbe(request);
        if (outcome.ok) {
          probeCompleted$.next(
            custodyActions.probeCustodyCreatorIndexCompleted({
              requestId: request.requestId,
              result: outcome.result,
            }),
          );
        } else {
          probeFailed$.next(
            custodyActions.probeCustodyCreatorIndexFailed({
              requestId: request.requestId,
              error: outcome.error,
            }),
          );
        }
        return;
      }
      case 'cardanoContext.submitTx': {
        const { serializedTx } = args[0] as { serializedTx: string };
        submitted.push(serializedTx);
        const txId = Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(serializedTx),
        ).getId();
        const answer = control.answerSubmit();
        if (answer === 'ok') {
          submitCompleted$.next(
            actions.submitTxCompleted({ txId: txId as never }),
          );
        } else if (answer !== 'silent') {
          submitFailed$.next(
            actions.submitTxFailed({
              txId: txId as never,
              error: answer.error,
            }),
          );
        }
        return;
      }
      case 'activities.upsertActivities': {
        const { accountId, activities } = args[0] as {
          accountId: AccountId;
          activities: Activity[];
        };
        // Upserted by id, as the activities slice does.
        const byId = new Map(
          [...(activities$.value[accountId] ?? []), ...activities].map(
            activity => [activity.activityId, activity] as const,
          ),
        );
        activities$.next({
          ...activities$.value,
          [accountId]: [...byId.values()],
        });
        return;
      }
      case 'wallets.addWallet': {
        const wallet = args[0] as AnyWallet;
        if (!wallets$.value.some(w => w.walletId === wallet.walletId)) {
          wallets$.next([...wallets$.value, wallet]);
        }
        return;
      }
      case 'wallets.updateWallet': {
        const { id, changes } = args[0] as {
          id: WalletId;
          changes: Partial<AnyWallet>;
        };
        wallets$.next(
          wallets$.value.map(wallet =>
            wallet.walletId === id
              ? ({ ...wallet, ...changes } as AnyWallet)
              : wallet,
          ),
        );
        return;
      }
      case 'wallets.updateAccount': {
        const [walletId, accountId, changes] = args as [
          WalletId,
          AccountId,
          Partial<AnyAccount>,
        ];
        wallets$.next(
          wallets$.value.map(wallet =>
            wallet.walletId === walletId
              ? ({
                  ...wallet,
                  accounts: wallet.accounts.map(account =>
                    account.accountId === accountId
                      ? { ...account, ...changes }
                      : account,
                  ),
                } as AnyWallet)
              : wallet,
          ),
        );
        return;
      }
      default:
        throw new Error(`Unexpected dispatch ${key}`);
    }
  });

  const wallet = {
    stateObservables: {
      cardanoContext: {
        selectAccountUtxos$: settledUtxos$,
        selectChainId$: chainId$,
        selectEraSummaries$: eraSummaries$,
        selectTip$: tip$,
        selectTransactionHistoryGroupedByAccount$: history$,
      },
      cardanoCustody: {
        selectCardanoCustodyAccountState$: accountState$,
        selectSettledCardanoCustodyAccountState$: settledAccountState$,
      },
      wallets: { selectAll$: wallets$ },
      activities: {
        selectPendingActivitiesByAccount$: activities$.pipe(
          map(byAccount =>
            Object.fromEntries(
              Object.entries(byAccount).map(([accountId, activities]) => [
                accountId,
                activities.filter(
                  activity => activity.type === ActivityType.Pending,
                ),
              ]),
            ),
          ),
        ),
      },
    },
    actionObservables: {
      cardanoContext: {
        submitTxCompleted$: submitCompleted$,
        submitTxFailed$: submitFailed$,
      },
      cardanoCustody: {
        buildCustodyTransactionCompleted$: buildCompleted$,
        buildCustodyTransactionFailed$: buildFailed$,
        probeCustodyCreatorIndexCompleted$: probeCompleted$,
        probeCustodyCreatorIndexFailed$: probeFailed$,
      },
    },
    dispatch,
  } as unknown as WalletWithCardanoCustody;

  return {
    wallet,
    dispatch,
    control,
    builds,
    probes,
    submitted,
    wallets$,
    settledUtxos$,
    activities$,
    history$,
    tip$,
    chainId$,
    eraSummaries$,
    networkInfo$,
    /** Answer every build with `outcome`. */
    answerBuildsWith: (outcome: CardanoCustodyBuildOutcome) => {
      control.answerBuild = () => outcome;
    },
    custodyAccount: (accountId: AccountId) =>
      custodyAccounts().find(account => account.accountId === accountId),
  };
};

export type CustodyTestWallet = ReturnType<typeof createCustodyTestWallet>;
