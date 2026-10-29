import {
  Cardano,
  ProviderError,
  ProviderFailure,
  Serialization,
} from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { mockProviders } from '@cardano-sdk/util-dev';
import {
  CardanoAccountId,
  CardanoCustodyWalletId,
  cardanoCustodyActions,
  classifyCardanoCustodyAccount,
} from '@lace-contract/cardano-context';
import { BlockchainNetworkId } from '@lace-contract/network';
import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  CUSTODY_DEVICE_KEY_PATH,
  custodyDeviceAccountIndex,
  custodyGrantAssetId,
  deriveCustodyAccountIdentity,
  encodeCustodyAccountState,
  encodeCustodyGrant,
} from '@lace-lib/cardano-custody';
import { BigNumber, Err, Ok } from '@lace-lib/util';
import { Serializable } from '@lace-lib/util-store';
import { firstValueFrom, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { vi } from 'vitest';

import { makeCustodyTransactionBuilding } from '../../../src/store/custody/build-side-effect';

import type { EraSummary } from '@cardano-sdk/core';
import type {
  CardanoCustodyAccount,
  CardanoCustodyBuildError,
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
  CardanoCustodyCollateralFunding,
  CardanoCustodyFeeFunding,
  RedeemerExecutionUnits,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  CustodyAccountIdentity,
  CustodyAccountState,
  CustodyGrant,
} from '@lace-lib/cardano-custody';

export const chainId = Cardano.ChainIds.Preprod;
export const version = CURRENT_CUSTODY_CONTRACT_VERSION;

/**
 * Preprod-like parameters: the values the upstream test fake pins, and
 * Preprod's execution prices, which price the fee and bound checks as the
 * chain does.
 */
export const protocolParameters = {
  ...mockProviders.protocolParameters,
  prices: { memory: 0.0577, steps: 0.0000721 },
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  maxExecutionUnitsPerTransaction: {
    memory: 14_000_000,
    steps: 10_000_000_000,
  },
  minFeeRefScriptCostPerByte: 15,
  costModels: new Map([
    [Cardano.PlutusLanguageVersion.V3, Array.from({ length: 297 }, () => 0)],
  ]),
} as unknown as Cardano.ProtocolParameters;

/** One era from the POSIX epoch with one-second slots: a slot is a second. */
export const eraSummaries: EraSummary[] = [
  {
    parameters: {
      epochLength: 432_000,
      slotLength: 1000 as EraSummary['parameters']['slotLength'],
    },
    start: { slot: 0, time: new Date(0) },
  },
];

export const keyHash = (byte: string): Crypto.Ed25519KeyHashHex =>
  Crypto.Ed25519KeyHashHex(byte.repeat(28));

export const deviceKeyHash = keyHash('d1');
export const otherDeviceKeyHash = keyHash('d2');
export const granteeKeyHash = keyHash('a9');
export const otherGranteeKeyHash = keyHash('a8');
export const creatorKeyHash = keyHash('c1');

const keyAddress = (paymentByte: string, stakeByte: string) =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    {
      type: Cardano.CredentialType.KeyHash,
      hash: Crypto.Hash28ByteBase16(paymentByte.repeat(28)),
    },
    {
      type: Cardano.CredentialType.KeyHash,
      hash: Crypto.Hash28ByteBase16(stakeByte.repeat(28)),
    },
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

export const sponsorPaymentKeyHash = '5a'.repeat(28);
export const sponsorStakeKeyHash = '5b'.repeat(28);
export const sponsorAddress = keyAddress('5a', '5b');
export const recipientAddress = keyAddress('e1', 'e2');
/** A Byron bootstrap address on a test network. */
export const TESTNET_BYRON_ADDRESS = Cardano.PaymentAddress(
  '37btjrVyb4KDXBNC4haBVPCrro8AQPHwvCMp3RFhhSVWwfFmZ6wwzSK6JK1hY6wHNmtrpTf1kdbva8TCneM2YsiXT7mrzT21EacHnPpz5YyUdj64na',
);
export const otherRecipientAddress = keyAddress('e3', 'e4');

export const identityOf = (creator: string): CustodyAccountIdentity => {
  const identity = deriveCustodyAccountIdentity({
    contractVersion: version,
    creatorKeyHash: creator,
    chainId,
  });
  if (!identity.ok) throw new Error('fixture identity');
  return identity.value;
};

export const identity = identityOf(creatorKeyHash);

/**
 * A test network the contract parks no script on, so builds attach the
 * proxy and the logic. Testnet addresses are the same as on Preprod.
 */
export const unparkedChainId = Cardano.ChainIds.Preview;

/** The current logic, whose script the parked UTxO or the witness set carries. */
export const currentLogic = version.logics.find(
  ({ hash }) => hash === version.currentLogicHash,
)!;

/** The UTxOs that park the proxy and the logic on Preprod, as the chain holds them. */
export const parkedScriptUtxos: Cardano.Utxo[] = (
  version.referenceScripts[chainId.networkMagic] ?? []
).map(({ txIn, address, coins, scriptHash }) => [
  { ...txIn, address },
  {
    address,
    value: { coins },
    scriptReference:
      scriptHash === version.accountValidatorHash
        ? version.accountValidator
        : currentLogic.script,
  },
]);

/** The `Run` redeemer of a logic withdrawal, as CBOR. */
export const RUN_REDEEMER_CBOR = 'd87980';

const txId = (seed: number): Cardano.TransactionId =>
  Cardano.TransactionId(seed.toString(16).padStart(64, '0'));

export const utxo = (
  seed: number,
  output: Cardano.TxOut,
  index = 0,
): Cardano.Utxo => [
  { txId: txId(seed), index, address: output.address },
  output,
];

export const feeUtxo = utxo(901, {
  address: sponsorAddress,
  value: { coins: 100_000_000n },
});
export const collateralUtxo = utxo(902, {
  address: sponsorAddress,
  value: { coins: 5_000_000n },
});

/** The inline datum exactly as a chain read decodes it. */
export const datumOf = (state: CustodyAccountState): Cardano.PlutusData =>
  Serialization.PlutusData.fromCbor(
    Serialization.PlutusData.fromCore(
      encodeCustodyAccountState(state),
    ).toCbor(),
  ).toCore();

export const datumCborOf = (state: CustodyAccountState): string =>
  Serialization.PlutusData.fromCore(encodeCustodyAccountState(state)).toCbor();

export const accountState = (
  overrides: Partial<CustodyAccountState> = {},
): CustodyAccountState => ({
  logic: HexBlob(CURRENT_CUSTODY_CONTRACT_VERSION.currentLogicHash),
  devices: [HexBlob(deviceKeyHash)],
  grantGeneration: 0n,
  nextSlot: 0n,
  revoked: [],
  outstanding: 0n,
  ...overrides,
});

export const controlUtxo = (
  state: CustodyAccountState = accountState(),
  { seed = 100, coins = 2_000_000n, id = identity } = {},
): Cardano.Utxo =>
  utxo(seed, {
    address: id.address,
    value: { coins, assets: new Map([[id.stateNftAssetId, 1n]]) },
    datum: datumOf(state),
  });

export const fundUtxo = (
  seed: number,
  coins: bigint,
  extra: Partial<Cardano.TxOut> = {},
): Cardano.Utxo =>
  utxo(seed, { address: identity.address, value: { coins }, ...extra });

export const EXPIRY_MS = 4_000_000_000_000n;

export const lovelaceGrant = (
  overrides: Partial<CustodyGrant['scope']> = {},
  slot = 0n,
  { grantee = granteeKeyHash as string, generation = 0n } = {},
): CustodyGrant => ({
  slot,
  grantee: HexBlob(grantee),
  generation,
  scope: {
    asset: { policyId: HexBlob(''), assetName: HexBlob('') },
    perCallCap: 20_000_000n,
    cap: 50_000_000n,
    lovelacePerCallCap: 0n,
    lovelaceCap: 0n,
    expiresAt: EXPIRY_MS,
    recipients: [],
    ...overrides,
  },
});

/** A grant UTxO at the account: lovelace and the grant's token beside its inline grant. */
export const grantUtxo = (
  grant: CustodyGrant,
  { seed = 500 + Number(grant.slot), coins = 2_000_000n, id = identity } = {},
): Cardano.Utxo =>
  utxo(seed, {
    address: id.address,
    value: {
      coins,
      assets: new Map([
        [
          custodyGrantAssetId(
            {
              accountValidatorHash: id.contractVersion.accountValidatorHash,
              stakeScriptHash: id.stakeScriptHash,
            },
            grant.slot,
          ),
          1n,
        ],
      ]),
    },
    datum: Serialization.PlutusData.fromCbor(
      Serialization.PlutusData.fromCore(encodeCustodyGrant(grant)).toCbor(),
    ).toCore(),
  });

const walletId = CardanoCustodyWalletId.derive(
  chainId.networkMagic,
  identity.stakeScriptHash,
);
export const accountId: AccountId = CardanoAccountId(
  walletId,
  0,
  chainId.networkMagic,
);

export const custodyAccount = (
  device: CardanoCustodyAccount['blockchainSpecific']['device'] = {
    extendedAccountPublicKey: Crypto.Bip32PublicKeyHex('ab'.repeat(64)),
    index: 0,
    keyHash: deviceKeyHash,
    channel: { type: 'hosted', origin: 'https://signer.example' },
  },
  accountChainId: Cardano.ChainId = chainId,
): CardanoCustodyAccount => ({
  accountId,
  walletId,
  accountType: 'CardanoCustody',
  blockchainName: 'Cardano',
  blockchainNetworkId: BlockchainNetworkId('cardano-1'),
  networkType: 'testnet',
  metadata: { name: 'custody' },
  blockchainSpecific: {
    chainId: accountChainId,
    accountValidatorHash: version.accountValidatorHash,
    creatorKeyHash,
    stakeScriptHash: identity.stakeScriptHash,
    address: identity.address,
    rewardAccount: identity.rewardAccount,
    ...(device && { device }),
  },
});

/** The CIP-1854 account key of a fixed passkey on Preprod. */
export const deviceAccountPublicKey =
  async (): Promise<Crypto.Bip32PublicKeyHex> => {
    await Crypto.ready();
    const harden = (index: number) => index + 0x80_00_00_00;
    return Crypto.Bip32PrivateKey.fromBip39Entropy(
      Buffer.from('00112233445566778899aabbccddeeff', 'hex'),
      '',
    )
      .derive([
        harden(CUSTODY_DEVICE_KEY_PATH.purpose),
        harden(CUSTODY_DEVICE_KEY_PATH.coinType),
        harden(custodyDeviceAccountIndex(version, chainId.networkMagic)),
      ])
      .toPublic()
      .hex();
  };

export const now = (): number => Date.now();

export const feeFunding = (
  overrides: Partial<CardanoCustodyFeeFunding> = {},
): CardanoCustodyFeeFunding => ({
  mode: 'fee',
  feeUtxo,
  collateralUtxo,
  sponsorAddress,
  maxSponsoredLovelace: 6_000_000n,
  validUntil: now() + 540_000,
  ...overrides,
});

export const collateralFunding = (
  overrides: Partial<CardanoCustodyCollateralFunding> = {},
): CardanoCustodyCollateralFunding => ({
  mode: 'collateral',
  collateralUtxo,
  sponsorAddress,
  validUntil: now() + 540_000,
  ...overrides,
});

/** Budgets a provider measures every redeemer at, unless a test says otherwise. */
export const MEASURED: Cardano.ExUnits = {
  memory: 300_000,
  steps: 100_000_000,
};

/** Answers every redeemer of the transaction with one budget. */
export const evaluateAll =
  (budget: Cardano.ExUnits = MEASURED) =>
  (tx: Serialization.Transaction): RedeemerExecutionUnits[] =>
    (tx.witnessSet().redeemers()?.toCore() ?? []).map(({ purpose, index }) => ({
      purpose,
      index,
      budget,
    }));

interface RewardAccountFixture {
  isRegistered: boolean;
  /** Registered and delegated to a pool; `isRegistered` by default. */
  isActive?: boolean;
  withdrawableAmount: bigint;
}

export const logicRewardAccountOf = (): Cardano.RewardAccount =>
  Cardano.RewardAccount.fromCredential(
    {
      type: Cardano.CredentialType.ScriptHash,
      hash: version.currentLogicHash,
    },
    chainId.networkId,
  );

export interface ChainFixture {
  /** UTxOs the chain holds per address. */
  utxosAt?: (address: string) => Cardano.Utxo[];
  /** Every reward account but a logic's; unregistered by default. */
  rewardAccount?: (rewardAccount: string) => RewardAccountFixture;
  /**
   * The logic's reward account: registered, delegated to no pool and empty
   * by default, as on Preprod.
   */
  logicRewardAccount?: RewardAccountFixture;
  /** A plain error stands for a script failure; a provider error is kept. */
  evaluate?: (
    tx: Serialization.Transaction,
  ) => Error | RedeemerExecutionUnits[];
  protocolParameters?: Cardano.ProtocolParameters | Error;
}

export const providerError = (message: string) =>
  new ProviderError(ProviderFailure.InvalidResponse, undefined, message);

export const fakeProvider = (fixture: ChainFixture = {}) => {
  const evaluated: Serialization.Transaction[] = [];
  const provider = {
    getProtocolParameters: vi.fn(() => {
      const parameters = fixture.protocolParameters ?? protocolParameters;
      return of(parameters instanceof Error ? Err(parameters) : Ok(parameters));
    }),
    getUtxosAtAddress: vi.fn(({ address }: { address: string }) =>
      of(Ok(fixture.utxosAt?.(address) ?? [])),
    ),
    getRewardAccountInfo: vi.fn(
      ({ rewardAccount }: { rewardAccount: string }) => {
        const info =
          rewardAccount === logicRewardAccountOf()
            ? fixture.logicRewardAccount ?? {
                isRegistered: true,
                isActive: false,
                withdrawableAmount: 0n,
              }
            : fixture.rewardAccount?.(rewardAccount) ?? {
                isRegistered: false,
                withdrawableAmount: 0n,
              };
        return of(
          Ok({
            isActive: info.isActive ?? info.isRegistered,
            isRegistered: info.isRegistered,
            rewardsSum: BigNumber(0n),
            controlledAmount: BigNumber(0n),
            withdrawableAmount: BigNumber(info.withdrawableAmount),
          }),
        );
      },
    ),
    evaluateTx: vi.fn(({ tx }: { tx: Serialization.TxCBOR }) => {
      const transaction = Serialization.Transaction.fromCbor(tx);
      evaluated.push(transaction);
      const result = (fixture.evaluate ?? evaluateAll())(transaction);
      if (result instanceof ProviderError) return of(Err(result));
      return of(
        result instanceof Error
          ? Err(providerError(result.message))
          : Ok(result),
      );
    }),
  };
  return { provider, evaluated };
};

export interface StoreFixture {
  account?: CardanoCustodyAccount | undefined;
  /** The account UTxOs the store holds, settled. */
  settledUtxos?: Cardano.Utxo[];
  /** The account UTxOs the classifier sees; the settled ones by default. */
  inFlightUtxos?: Cardano.Utxo[];
  chainId?: Cardano.ChainId | undefined;
  eraSummaries?: EraSummary[] | undefined;
  /** False while nothing is known of the account's UTxOs. */
  isClassified?: boolean;
}

export const stateObservables = (store: StoreFixture = {}) => {
  const account = 'account' in store ? store.account : custodyAccount();
  const settled = store.settledUtxos ?? [];
  const inFlight = store.inFlightUtxos ?? settled;
  return {
    wallets: {
      selectAll$: of(account ? [{ walletId, accounts: [account] }] : []),
    },
    cardanoContext: {
      selectChainId$: of('chainId' in store ? store.chainId : chainId),
      selectEraSummaries$: of(
        'eraSummaries' in store ? store.eraSummaries : eraSummaries,
      ),
      selectAccountUtxos$: of(
        store.settledUtxos ? { [accountId]: settled } : {},
      ),
    },
    cardanoCustody: {
      selectCardanoCustodyAccountState$: of((id: AccountId) =>
        account && id === account.accountId && store.isClassified !== false
          ? classifyCardanoCustodyAccount({
              account: account.blockchainSpecific,
              utxos: inFlight,
              withdrawableRewards: 0n,
              protocolParameters,
            })
          : undefined,
      ),
    },
  };
};

export type BuildOutcome =
  | { ok: false; error: CardanoCustodyBuildError }
  | { ok: true; result: CardanoCustodyBuildResult };

/** Runs one request through the build side effect and decodes its answer. */
export const runBuild = async (
  request: CardanoCustodyBuildRequest,
  {
    store = {},
    provider = fakeProvider().provider,
    logger = dummyLogger,
  }: {
    store?: StoreFixture;
    provider?: ReturnType<typeof fakeProvider>['provider'];
    logger?: typeof dummyLogger;
  } = {},
): Promise<BuildOutcome> => {
  const action = await firstValueFrom(
    makeCustodyTransactionBuilding()(
      {
        cardanoCustody: {
          buildCustodyTransaction$: of(
            cardanoCustodyActions.cardanoCustody.buildCustodyTransaction(
              request,
            ),
          ),
        },
      } as never,
      stateObservables(store) as never,
      {
        cardanoProvider: provider,
        logger,
        actions: cardanoCustodyActions,
      } as never,
    ),
  );
  const { payload } = action as unknown as {
    payload:
      | { requestId: string; error: Serializable<CardanoCustodyBuildError> }
      | { requestId: string; result: Serializable<CardanoCustodyBuildResult> };
  };
  if (payload.requestId !== request.requestId) {
    throw new Error('answer under another request id');
  }
  return 'result' in payload
    ? { ok: true, result: Serializable.from(payload.result) }
    : { ok: false, error: Serializable.from(payload.error) };
};

export const expectFailure = (
  outcome: BuildOutcome,
): CardanoCustodyBuildError => {
  if (outcome.ok) throw new Error('expected the build to fail');
  return outcome.error;
};

export const expectSuccess = (
  outcome: BuildOutcome,
): CardanoCustodyBuildResult => {
  if (!outcome.ok) {
    throw new Error(
      `expected the build to succeed: ${JSON.stringify(
        outcome.error,
        (_: string, value: unknown) =>
          typeof value === 'bigint' ? value.toString() : value,
      )}`,
    );
  }
  return outcome.result;
};

export const transactionOf = (result: CardanoCustodyBuildResult) =>
  Serialization.Transaction.fromCbor(result.transaction);
