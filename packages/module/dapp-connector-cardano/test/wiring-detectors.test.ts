import { Cardano, Serialization } from '@cardano-sdk/core';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { EMPTY, firstValueFrom, NEVER, of, Subject } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeCardanoDappConnectorDependencies } from '../src/browser/store/dependencies/dapp-connector';
import { connectCardanoDappConnectorApi } from '../src/browser/store/side-effects';
import { TxSignErrorCode } from '../src/common/api-error';

import { utxo } from './support/collateral-api-fixture';

import type { ActionCreators, Selectors } from '../src';
import type { SenderContext } from '../src/browser/types';
import type { CardanoDappConnectorApi } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import type { CardanoConfirmationRequest } from '../src/common/store/dependencies/create-confirmation-callback';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountUtxoMap } from '@lace-contract/cardano-context';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

/**
 * Every scenario here drives the REAL production wiring:
 * `connectCardanoDappConnectorApi` -- the function that decides which named
 * selector feeds `ownershipUtxos$` and which feeds `accountUtxos$` -- through
 * the real dependency initializer to a real `CardanoDappConnectorApi`. Only
 * the transport is mocked, per `dapp-connector-extension.test.ts`.
 *
 * Two things only this level can catch: that selector binding (a test built at
 * the API level picks the values itself, so it cannot see them swapped), and
 * the chained-tx-output cache's own resolution, driven from a real preceding
 * `submitTx` on the same side-effect instance rather than a stubbed
 * `resolveChainedInputs`.
 *
 * The PASS scenario auto-DECLINES consent the moment it is requested, so it
 * rejects with `UserDeclined` if and only if it survived the guard; a
 * `ProofGeneration` rejection there would mean the guard misfired.
 */

vi.mock('webextension-polyfill', () => ({
  runtime: { id: 'test-extension-id' },
}));

vi.mock('@lace-lib/dapp-connector', () => ({
  senderOrigin: (sender: Runtime.MessageSender) => sender.url,
}));

const mockExposeApi = vi.fn();
const mockShutdown = vi.fn();

vi.mock('@lace-lib/extension-messaging', async () => {
  const actual = await vi.importActual('@lace-lib/extension-messaging');
  return {
    ...actual,
    exposeApi: (...arguments_: unknown[]) => {
      mockExposeApi(...arguments_);
      // The connector relays messenger.disconnect$ into the confirmation
      // callback; no port ever drops in these scenarios.
      return { shutdown: mockShutdown, messenger: { disconnect$: NEVER } };
    },
  };
});

vi.mock('../src/browser/store/util', async () => {
  const actual = await vi.importActual('../src/browser/store/util');
  return {
    ...actual,
    // Auto-declines the instant a signTx confirmation is requested -- see the
    // file-level note on why REFUSE scenarios never reach this at all.
    signTx$: vi.fn(({ request }: { request: CardanoConfirmationRequest }) => {
      request.resolve({ outcome: 'rejected' });
      return of({ type: 'SIGN_TX_ACTION' });
    }),
    signData$: vi.fn().mockReturnValue(of({ type: 'SIGN_DATA_ACTION' })),
    detectViewClosure: vi.fn().mockReturnValue(EMPTY),
  };
});

interface ExposeApiConfig {
  api$: Observable<CardanoDappConnectorApi>;
}

const getExposeApiConfig = (): ExposeApiConfig => {
  const calls = mockExposeApi.mock.calls as [[ExposeApiConfig, unknown]];
  return calls.at(-1)![0];
};

const firstFromApi$ = async (): Promise<CardanoDappConnectorApi> =>
  firstValueFrom(getExposeApiConfig().api$);

const ACCOUNT_ID = AccountId('acct-wiring');
const WALLET_ID = WalletId('wallet-wiring');
const ORIGIN = 'https://test-dapp.com';
const CHAIN_ID = Cardano.ChainIds.Preprod;
const SENDER: SenderContext = {
  sender: { url: ORIGIN, tab: { id: 1 } } as SenderContext['sender'],
};

const cred = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: hash as never,
});
const baseAddress = (
  paymentHash: string,
  stakeHash: string,
): Cardano.PaymentAddress =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    cred(paymentHash),
    cred(stakeHash),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

const OWN_PAYMENT_CRED = 'aa'.repeat(28);
const OWN_ADDRESS = baseAddress(OWN_PAYMENT_CRED, 'bb'.repeat(28));
const FOREIGN_ADDRESS = baseAddress('cc'.repeat(28), 'dd'.repeat(28));

// w4: same payment credential as OWN_ADDRESS, a FOREIGN stake credential --
// a different full bech32 address, so strict membership must read it as foreign.
const REUSED_CREDENTIAL_ADDRESS = baseAddress(
  OWN_PAYMENT_CRED,
  'ee'.repeat(28),
);

// Pads/truncates any hex-safe seed to a 64-hex-char transaction id -- distinct
// seeds below (single letters, or the per-call counter in buildTx) always
// yield distinct, well-formed ids.
const txId32 = (seed: string) =>
  seed.padEnd(64, '0').slice(0, 64) as Cardano.TransactionId;
const SPEND_INPUT: Cardano.TxIn = { txId: txId32('f'.repeat(64)), index: 0 };

const account: AnyAccount = {
  accountId: ACCOUNT_ID,
  walletId: WALLET_ID,
  accountIndex: 0,
  accountType: 'InMemory',
  name: 'Wiring Test Account',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 0,
    chainId: CHAIN_ID,
    extendedAccountPublicKey: '0'.repeat(128),
  },
} as unknown as AnyAccount;

const wallet: AnyWallet = {
  walletId: WALLET_ID,
  name: 'Wiring Test Wallet',
  type: WalletType.InMemory,
  metadata: {},
  accounts: [account],
} as unknown as AnyWallet;

const mockAddresses: AnyAddress[] = [
  {
    address: OWN_ADDRESS,
    accountId: ACCOUNT_ID,
    blockchainName: 'Cardano',
    data: {
      type: 0,
      index: 0,
      networkId: 0,
      accountIndex: 0,
      rewardAccount: Cardano.RewardAccount(
        'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
      ),
      stakeKeyDerivationPath: { role: 2, index: 0 },
    },
  } as unknown as AnyAddress,
];

const txSuffix = { value: 0 };
const buildTx = ({
  collaterals,
  collateralReturnAddress,
  outputAddress = OWN_ADDRESS,
}: {
  collaterals?: Cardano.TxIn[];
  collateralReturnAddress?: Cardano.PaymentAddress;
  outputAddress?: Cardano.PaymentAddress;
}): { cbor: string; id: Cardano.TransactionId } => {
  txSuffix.value += 1;
  const id = txId32(`b${txSuffix.value}`);
  const tx = Serialization.Transaction.fromCore({
    id,
    body: {
      inputs: [SPEND_INPUT],
      outputs: [
        {
          address: outputAddress,
          value: { coins: 1_000_000n } as unknown as Cardano.Value,
        },
      ],
      fee: 170_000n,
      ...(collaterals ? { collaterals } : {}),
      ...(collateralReturnAddress
        ? {
            collateralReturn: {
              address: collateralReturnAddress,
              value: { coins: 2_000_000n } as unknown as Cardano.Value,
            },
          }
        : {}),
    } as Cardano.TxBody,
    witness: { signatures: new Map() },
  } as Cardano.Tx);
  return { cbor: tx.toCbor() as string, id: tx.getId() };
};

const createActionObservables = () => ({
  cardanoDappConnector: {
    confirmConnect$: new Subject<void>(),
    rejectConnect$: new Subject<void>(),
    confirmSignTx$: new Subject<void>(),
    rejectSignTx$: new Subject<void>(),
    confirmSignData$: new Subject<void>(),
    rejectSignData$: new Subject<void>(),
  },
  views: {
    viewDisconnected$: new Subject<{ payload: string }>(),
  },
});

/**
 * Builds one live `connectCardanoDappConnectorApi` instance and returns the REAL
 * `CardanoDappConnectorApi` it constructs, plus a handle to call `submitTx` first
 * (to populate the real chained-tx-output-cache) before `signTx`.
 *
 * `settledUtxos` / `availableUtxos` are wired to the exact fields named in
 * the production binding (`accountUtxos$: selectAvailableAccountUtxos$`,
 * `ownershipUtxos$: selectCollateralOwnershipUtxos$`) -- callers make them differ so the test is
 * sensitive to a swap of that binding.
 */
const setUpWiring = async ({
  settledUtxos = [],
  availableUtxos = [],
}: {
  settledUtxos?: Cardano.Utxo[];
  availableUtxos?: Cardano.Utxo[];
}) => {
  const stateObservables = {
    views: { selectOpenViews$: of([]) },
    appLock: { isUnlocked$: of(true) },
    dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
    cardanoContext: {
      selectChainId$: of(CHAIN_ID),
      // Ownership authority (settled, collateral-reserved UTxOs INCLUDED) --
      // feeds `ownershipUtxos$`.
      selectCollateralOwnershipUtxos$: of({
        [ACCOUNT_ID]: settledUtxos,
      } as unknown as AccountUtxoMap),
      // The spendable/available view -- feeds `accountUtxos$` per
      // feeds `accountUtxos$`. Deliberately DIFFERENT content from the above.
      selectAvailableAccountUtxos$: of({
        [ACCOUNT_ID]: availableUtxos,
      } as unknown as AccountUtxoMap),
      selectAccountUnspendableUtxos$: of({}),
      selectAccountTransactionHistory$: of({}),
      selectRewardAccountDetails$: of({}),
    },
    addresses: { selectAllAddresses$: of(mockAddresses) },
    cardanoDappConnector: {
      selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
    },
    wallets: {
      selectActiveNetworkAccounts$: of([account]),
      selectAll$: of([wallet]),
    },
  };

  const deps = {
    connectCardanoDappConnector: initializeCardanoDappConnectorDependencies({
      logger: dummyLogger,
    }).connectCardanoDappConnector,
    actions: { activities: { upsertActivities: vi.fn() } },
    authenticate: vi.fn().mockReturnValue(of(true)),
    accessAuthSecret: vi.fn(),
    cardanoProvider: {
      submitTx: vi.fn().mockReturnValue(of(Ok('mock-tx-hash'))),
      getTransactionDetails: vi.fn().mockReturnValue(of(Err(new Error('n/a')))),
    },
    // Never reached by any scenario in this file: w1/w2/w4 REFUSE inside
    // `#validateCanSign`, before a signer is ever selected; w3 auto-declines
    // consent before `signTransaction` is invoked.
    signerFactory: {
      canSign: () => false,
      createTransactionSigner: () => {
        throw new Error('not exercised by wiring-detector scenarios');
      },
    },
    logger: dummyLogger,
  };

  const sideEffect$ = connectCardanoDappConnectorApi(
    createActionObservables() as unknown as ActionObservables<ActionCreators>,
    stateObservables as unknown as StateObservables<Selectors>,
    deps as unknown as SideEffectDependencies &
      WithLaceContext<Selectors, ActionCreators>,
  );
  const subscription = sideEffect$.subscribe();
  const walletApi = await firstFromApi$();

  return {
    walletApi,
    subscription,
  };
};

const CASE_B_MESSAGE =
  "if the smart contract fails, this transaction would send this wallet's funds to an address this wallet doesn't own; Lace won't sign it.";

describe('wiring detectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('w1: a case-(b) tx whose collateral input is collateral-reserved (absent from the available view) is REFUSED through the real #validateCanSign wiring', async () => {
    const RESERVED_TX_ID = txId32('a1');
    const RESERVED_INPUT: Cardano.TxIn = { txId: RESERVED_TX_ID, index: 0 };
    const RESERVED_UTXO = utxo(RESERVED_TX_ID, 0, OWN_ADDRESS);

    const { walletApi, subscription } = await setUpWiring({
      // Settled (selectCollateralOwnershipUtxos$ -> ownershipUtxos$): INCLUDES the
      // collateral-reserved UTxO -- this is the correct ownership authority.
      settledUtxos: [RESERVED_UTXO],
      // Available (selectAvailableAccountUtxos$ -> accountUtxos$): EXCLUDES
      // it, exactly as a real collateral reservation would filter it out of
      // the spendable view. If `ownershipUtxos$` were swapped to bind
      // `ownershipUtxos$` to this observable instead, the guard would see an
      // empty ownership set for this input and misclassify as case (c).
      availableUtxos: [],
    });

    const { cbor } = buildTx({
      collaterals: [RESERVED_INPUT],
      collateralReturnAddress: FOREIGN_ADDRESS,
    });

    await expect(walletApi.signTx(cbor, true, SENDER)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: CASE_B_MESSAGE,
    });

    subscription.unsubscribe();
  });

  it('w2: a case-(b) tx whose collateral inputs are a collateral-reserved settled-only input AND a chained unsettled input (each absent from the OTHER half of the union) is REFUSED through the real wiring', async () => {
    // Two collateral inputs, each reachable only through a different half of
    // the ownership union. One identified own input is enough to refuse, so
    // the mixed tx alone reds only when BOTH halves fail; the chained-only tx
    // below isolates the chained cache (w1 already isolates the settled half).
    const RESERVED_TX_ID = txId32('b2');
    const RESERVED_INPUT: Cardano.TxIn = { txId: RESERVED_TX_ID, index: 0 };
    const RESERVED_UTXO = utxo(RESERVED_TX_ID, 0, OWN_ADDRESS);

    const { walletApi, subscription } = await setUpWiring({
      // Settled (-> ownershipUtxos$ per :495): includes the reserved input.
      settledUtxos: [RESERVED_UTXO],
      // Available (-> accountUtxos$ per :492): excludes it -- a real
      // collateral reservation would filter it out of the spendable view.
      availableUtxos: [],
    });

    // tx1: a harmless own-output tx, submitted for real so the production
    // chainedTxOutputCache (closure-private inside connectCardanoDappConnectorApi)
    // records its outputs via the real submitTransaction -> recordOwnTransaction
    // path, not a hand-fed resolveChainedInputs stub.
    const tx1 = buildTx({ outputAddress: OWN_ADDRESS });
    await walletApi.submitTx(tx1.cbor);

    // tx2: spends BOTH the settled-reserved input AND tx1's own (still
    // unsettled) output as its two collateral inputs.
    const chainedInput: Cardano.TxIn = { txId: tx1.id, index: 0 };
    const tx2 = buildTx({
      collaterals: [RESERVED_INPUT, chainedInput],
      collateralReturnAddress: FOREIGN_ADDRESS,
    });

    await expect(
      walletApi.signTx(tx2.cbor, true, SENDER),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: CASE_B_MESSAGE,
    });

    // tx3: the chained output as the ONLY collateral. Breaking the chained
    // cache leaves it unidentified, the verdict collapses to case (c) and the
    // request reaches consent instead of this refusal.
    const tx3 = buildTx({
      collaterals: [chainedInput],
      collateralReturnAddress: FOREIGN_ADDRESS,
    });

    await expect(
      walletApi.signTx(tx3.cbor, true, SENDER),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: CASE_B_MESSAGE,
    });

    subscription.unsubscribe();
  });

  it('w3: a case-(a) tx mixing a settled own collateral with a chained own collateral, own return, PASSES', async () => {
    const SETTLED_TX_ID = txId32('a3');
    const SETTLED_INPUT: Cardano.TxIn = { txId: SETTLED_TX_ID, index: 0 };
    const SETTLED_UTXO = utxo(SETTLED_TX_ID, 0, OWN_ADDRESS);

    const { walletApi, subscription } = await setUpWiring({
      settledUtxos: [SETTLED_UTXO],
      availableUtxos: [SETTLED_UTXO],
    });

    const tx1 = buildTx({ outputAddress: OWN_ADDRESS });
    await walletApi.submitTx(tx1.cbor);
    const chainedInput: Cardano.TxIn = { txId: tx1.id, index: 0 };

    const tx2 = buildTx({
      collaterals: [SETTLED_INPUT, chainedInput],
      collateralReturnAddress: OWN_ADDRESS,
    });

    // Auto-decline (mocked signTx$) fires the instant #validateCanSign lets the
    // request through to consent. UserDeclined proves it PASSED the collateral
    // guard; ProofGeneration carrying the collateral copy would prove the
    // opposite.
    await expect(
      walletApi.signTx(tx2.cbor, true, SENDER),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.UserDeclined,
    });

    subscription.unsubscribe();
  });

  it('w4: a case-(b) tx whose collateral_return reuses the wallet payment credential with a FOREIGN stake credential is REFUSED at seam level', async () => {
    // The collateral input is collateral-reserved (settled-only), so this test
    // reds under an `ownershipUtxos$` selector swap (which would misclassify
    // it as case (c), ALLOW) as well as under payment-credential matching
    // replacing strict full-address equality.
    const OWNED_TX_ID = txId32('a4');
    const OWNED_INPUT: Cardano.TxIn = { txId: OWNED_TX_ID, index: 0 };
    const OWNED_UTXO = utxo(OWNED_TX_ID, 0, OWN_ADDRESS);

    const { walletApi, subscription } = await setUpWiring({
      settledUtxos: [OWNED_UTXO],
      availableUtxos: [],
    });

    const { cbor } = buildTx({
      collaterals: [OWNED_INPUT],
      collateralReturnAddress: REUSED_CREDENTIAL_ADDRESS,
    });

    await expect(walletApi.signTx(cbor, true, SENDER)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: CASE_B_MESSAGE,
    });

    subscription.unsubscribe();
  });
});
