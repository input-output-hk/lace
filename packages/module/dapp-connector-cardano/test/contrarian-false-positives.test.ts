/**
 * Contrarian probe: does the network-binding rule refuse
 * transactions a real dApp legitimately sends?
 *
 * The rule is fail-closed in two halves. Half (a) -- no network-bearing element
 * may disagree -- cannot misfire on a same-network body. Half (b) -- at least
 * one such element must exist, unless the wallet owns every input -- is the
 * one that can refuse a legitimate transaction, so every case below asks the
 * same question: which real shapes carry no network-bearing element at all?
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromEncryptedRoot,
  withCollateralOwnershipGuard,
} from '@lace-contract/cardano-context';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, HexBytes, Ok } from '@lace-lib/util';
import { EMPTY, from, of, Subject, switchMap } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectCardanoDappConnectorApi } from '../src/browser/store/side-effects';
import { TxSignErrorCode } from '../src/common/api-error';
import { CardanoDappConnectorApi } from '../src/common/store/dependencies/cardano-dapp-connector-api';

import {
  isBoundToNetwork,
  isCborBoundToNetwork,
} from './support/network-binding-verdict';

import type { SigningResult } from '../src/browser/store/util';
import type { SenderContext } from '../src/browser/types';
import type { CardanoDappConnectorApiDependencies } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import type { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoTransactionSignerContext,
  WithCardanoKeyAgent$,
} from '@lace-contract/cardano-context';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';
import type { Runtime } from 'webextension-polyfill';

// Same mocks as sign-tx-cross-network-extension.test.ts: the popup flow is
// bypassed, but @cardano-sdk/crypto and @cardano-sdk/core are NOT mocked, so a
// successful sign below is a real signature over a real CBOR round-trip.
vi.mock('../src/browser/store/util', async () => {
  const actual = await vi.importActual('../src/browser/store/util');
  return {
    ...actual,
    signTx$: vi.fn().mockReturnValue(of({ type: 'SIGN_TX_ACTION' })),
    signData$: vi.fn().mockReturnValue(of({ type: 'SIGN_DATA_ACTION' })),
    detectViewClosure: vi.fn().mockReturnValue(EMPTY),
  };
});

(globalThis as { chrome?: unknown }).chrome = {
  sidePanel: { setPanelBehavior: () => {} },
};

const CORPUS = fileURLToPath(
  new URL('../../../next/hw-ledger/test/corpus/fixtures/', import.meta.url),
);

type Fixture = {
  context: { chainId: { networkId: number } };
  label: string;
  serializedTxCbor: string;
};

const fixtureFiles: string[] = (
  JSON.parse(readFileSync(`${CORPUS}index.json`, 'utf8')) as {
    fixtures: { file: string }[];
  }
).fixtures.map(f => f.file);

const readFixture = (file: string): Fixture =>
  JSON.parse(readFileSync(`${CORPUS}${file}`, 'utf8')) as Fixture;

// A real preview address + reward account, lifted from the hw-ledger corpus, so
// the synthetic bodies below are decoded by the same code path as real ones.
const TESTNET_ADDRESS =
  'addr_test1qrwz2p2cf8wuu8hv3epk5axwkmyq9x2sava6cj8vjl7wxd33c35de34kpwz3emx2x8mntlugg8e3xvplfwtfyysvksdq5c06gf' as Cardano.PaymentAddress;
const TESTNET_REWARD_ACCOUNT =
  'stake_test1uqcug6xuc6mqhpguan9rrae4l7yyrucnxql5h95jzgxtgxsf8qd5r' as Cardano.RewardAccount;

const TESTNET = Cardano.NetworkId.Testnet;
const MAINNET = Cardano.NetworkId.Mainnet;

const inputs = [
  { txId: Cardano.TransactionId('a'.repeat(64)), index: 0 },
] as Cardano.TxIn[];

const stakeCredential = {
  hash: Hash28ByteBase16('c'.repeat(56)),
  type: Cardano.CredentialType.KeyHash,
};

/** A body with nothing but the fields named -- no outputs unless given. */
const body = (fields: Partial<Cardano.TxBody>): Cardano.TxBody =>
  ({
    inputs,
    outputs: [],
    fee: 180_000n,
    ...fields,
  } as Cardano.TxBody);

const testnetOutput = (extra: Partial<Cardano.TxOut> = {}): Cardano.TxOut =>
  ({
    address: TESTNET_ADDRESS,
    value: { coins: 3_000_000n },
    ...extra,
  } as Cardano.TxOut);

describe('LW-15469 contrarian: shapes the network-binding rule refuses', () => {
  describe('ground truth -- the hw-ledger corpus (14 real transaction shapes)', () => {
    const results = fixtureFiles.map(file => {
      const fixture = readFixture(file);
      const networkId = fixture.context.chainId.networkId as Cardano.NetworkId;
      let bound: boolean | 'decode-threw';
      let outputCount = -1;
      try {
        const decoded = Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(fixture.serializedTxCbor),
        ).toCore();
        outputCount = decoded.body.outputs.length;
        bound = isBoundToNetwork(decoded.body, networkId);
      } catch {
        bound = 'decode-threw';
      }
      return { file, label: fixture.label, networkId, outputCount, bound };
    });

    it('prints the per-fixture verdict', () => {
      // eslint-disable-next-line no-console
      console.table(results);
      expect(results).toHaveLength(14);
    });

    it.each(results)(
      '$file ($label): rule accepts it on networkId $networkId',
      ({ bound }) => {
        expect(bound).toBe(true);
      },
    );
  });

  describe('sanity -- half (a) does not misfire on same-network bodies', () => {
    it('accepts a script address carrying an inline datum', () => {
      const scriptAddress = Cardano.EnterpriseAddress.fromCredentials(TESTNET, {
        hash: Hash28ByteBase16('d'.repeat(56)),
        type: Cardano.CredentialType.ScriptHash,
      })
        .toAddress()
        .toBech32() as Cardano.PaymentAddress;

      expect(
        isBoundToNetwork(
          body({
            outputs: [
              {
                address: scriptAddress,
                value: { coins: 5_000_000n },
                datum: 42n,
              } as unknown as Cardano.TxOut,
            ],
          }),
          TESTNET,
        ),
      ).toBe(true);
    });

    it('accepts a pointer-address output', () => {
      const pointer = Cardano.PointerAddress.fromCredentials(
        TESTNET,
        { hash: Hash28ByteBase16('e'.repeat(56)), type: 0 },
        {
          slot: 1n,
          txIndex: Cardano.TxIndex(2),
          certIndex: Cardano.CertIndex(3),
        },
      )
        .toAddress()
        .toBech32() as Cardano.PaymentAddress;

      expect(
        isBoundToNetwork(
          body({ outputs: [testnetOutput({ address: pointer })] }),
          TESTNET,
        ),
      ).toBe(true);
    });

    it('accepts a Byron (legacy) output on the network it belongs to', () => {
      const byronMainnet = Cardano.ByronAddress.fromCredentials(
        Hash28ByteBase16('f'.repeat(56)),
        {},
        Cardano.ByronAddressType.PubKey,
      )
        .toAddress()
        .toBase58();

      expect(
        isBoundToNetwork(
          body({ outputs: [testnetOutput({ address: byronMainnet })] }),
          MAINNET,
        ),
      ).toBe(true);
    });

    it('accepts a withdrawal-only body (no outputs) -- the reward account speaks', () => {
      expect(
        isBoundToNetwork(
          body({
            withdrawals: [
              { stakeAddress: TESTNET_REWARD_ACCOUNT, quantity: 1_000_000n },
            ],
          }),
          TESTNET,
        ),
      ).toBe(true);
    });

    it('accepts a collateral-only spend whose change comes back via collateralReturn', () => {
      expect(
        isBoundToNetwork(
          body({
            collateralReturn: testnetOutput(),
            collaterals: inputs,
          } as Partial<Cardano.TxBody>),
          TESTNET,
        ),
      ).toBe(true);
    });
  });

  describe('half (b) -- bodies with NO network-bearing element are refused', () => {
    const refused: { shape: string; body: Cardano.TxBody }[] = [];

    const probe = (shape: string, txBody: Cardano.TxBody) => {
      const isBound = isBoundToNetwork(txBody, TESTNET);
      if (!isBound) refused.push({ shape, body: txBody });
      return isBound;
    };

    it('refuses a body with no outputs at all (inputs + fee only)', () => {
      expect(probe('no outputs at all', body({}))).toBe(false);
    });

    it('refuses a stake-registration-only body with no change output', () => {
      expect(
        probe(
          'stake registration only',
          body({
            certificates: [
              {
                __typename: Cardano.CertificateType.StakeRegistration,
                stakeCredential,
              } as Cardano.Certificate,
            ],
          }),
        ),
      ).toBe(false);
    });

    it('refuses a stake-delegation-only body with no change output', () => {
      expect(
        probe(
          'stake delegation only',
          body({
            certificates: [
              {
                __typename: Cardano.CertificateType.StakeDelegation,
                stakeCredential,
                poolId: Cardano.PoolId(
                  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
                ),
              } as Cardano.Certificate,
            ],
          }),
        ),
      ).toBe(false);
    });

    it('refuses a stake-deregistration-only body with no change output', () => {
      expect(
        probe(
          'stake deregistration only',
          body({
            certificates: [
              {
                __typename: Cardano.CertificateType.StakeDeregistration,
                stakeCredential,
              } as Cardano.Certificate,
            ],
          }),
        ),
      ).toBe(false);
    });

    it('refuses a DRep-registration-only body (Conway governance)', () => {
      expect(
        probe(
          'DRep registration only',
          body({
            certificates: [
              {
                __typename:
                  Cardano.CertificateType.RegisterDelegateRepresentative,
                dRepCredential: stakeCredential,
                deposit: 500_000_000n,
              } as unknown as Cardano.Certificate,
            ],
          }),
        ),
      ).toBe(false);
    });

    it('refuses a vote-only body (DRep casting votes, no change output)', () => {
      expect(
        probe(
          'voting procedures only',
          body({
            votingProcedures: [
              {
                voter: {
                  __typename: Cardano.VoterType.dRepKeyHash,
                  credential: stakeCredential,
                },
                votes: [
                  {
                    actionId: {
                      id: Cardano.TransactionId('b'.repeat(64)),
                      actionIndex: 0,
                    },
                    votingProcedure: { vote: Cardano.Vote.yes },
                  },
                ],
              } as unknown as Cardano.VotingProcedures[number],
            ],
          }),
        ),
      ).toBe(false);
    });

    it('refuses a committee hot-key authorization body', () => {
      expect(
        probe(
          'committee hot-key authorization only',
          body({
            certificates: [
              {
                __typename: Cardano.CertificateType.AuthorizeCommitteeHot,
                coldCredential: stakeCredential,
                hotCredential: stakeCredential,
              } as unknown as Cardano.Certificate,
            ],
          }),
        ),
      ).toBe(false);
    });

    it('refuses a treasury-donation-only body (Conway)', () => {
      expect(
        probe(
          'treasury donation only',
          body({
            donation: 1_000_000n,
            currentTreasuryValue: 10_000_000n,
          } as Partial<Cardano.TxBody>),
        ),
      ).toBe(false);
    });

    it('refuses a mint-only body with no output to carry the minted asset', () => {
      expect(
        probe(
          'mint only, no outputs',
          body({
            mint: new Map([
              [Cardano.AssetId(`${'1'.repeat(56)}${'54'}`), 1n],
            ]) as Cardano.TokenMap,
          }),
        ),
      ).toBe(false);
    });

    it('refuses a reference-input-only body (read-only script interaction)', () => {
      expect(
        probe(
          'reference inputs only, no outputs',
          body({ referenceInputs: inputs } as Partial<Cardano.TxBody>),
        ),
      ).toBe(false);
    });

    it('refuses a required-signer-only body (staged multi-sig co-signing)', () => {
      expect(
        probe(
          'required extra signatures only',
          body({
            requiredExtraSignatures: [Hash28ByteBase16('0'.repeat(56))],
          } as Partial<Cardano.TxBody>),
        ),
      ).toBe(false);
    });

    it('lists every refused shape', () => {
      // eslint-disable-next-line no-console
      console.log(
        'REFUSED SHAPES:',
        refused.map(r => r.shape),
      );
      expect(refused.length).toBeGreaterThan(0);
    });
  });

  describe('half (b) -- the same shapes survive once ONE output exists', () => {
    it('a stake-registration body with a change output is accepted', () => {
      expect(
        isBoundToNetwork(
          body({
            outputs: [testnetOutput()],
            certificates: [
              {
                __typename: Cardano.CertificateType.StakeRegistration,
                stakeCredential,
              } as Cardano.Certificate,
            ],
          }),
          TESTNET,
        ),
      ).toBe(true);
    });
  });

  describe('the CBOR wrapper refuses anything it cannot decode', () => {
    it('refuses a body the decoder rejects, reporting it as a network refusal', () => {
      expect(isCborBoundToNetwork('deadbeef', TESTNET)).toBe(false);
    });

    it('refuses a CBOR-valid non-transaction the same way', () => {
      expect(isCborBoundToNetwork('83a0a0f5', TESTNET)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Real-path A/B. The unit checks above show the RULE refuses a zero-output
// body; these drive the production extension wiring -- the same harness as
// sign-tx-cross-network-extension.test.ts -- to show the refusal reaches the
// dApp as a CIP-30 error, and that the ONLY difference between refused and
// signed is the presence of one change output on the wallet's own network.
// ---------------------------------------------------------------------------

const PASSWORD = 'ComplexPassword2024!';
const HARNESS_FIXTURE = {
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 } as Cardano.ChainId,
  extendedAccountPublicKey:
    'a79619cd18f11202741213ab003dd40bffb2a31e8ad1bc5aab6f02be3c8aa9218d515cb54181fb2f5fc3af329e80949c082fb52f7b07e359bd7835a6762148bf' as Bip32PublicKeyHex,
  encryptedRootPrivateKey: HexBytes(
    '1a671129801c208c3c5ffa99ae85cf36d5a323144a427f17bb3a1b50cc36099752ca8b045138bce43f0636f2bb45380e0912c85a0834c26f632011c39c7a71c3e8543490a8656c2ebdb40d375dca2eb9e4a652a637631890d4776d5ad7319abd1d0bd3c1836a8d914050f28c690441bdf00d2b15416e0692f057e9f2205401948235f7efa7598e7fc737fa52066299c7cfc96ebf80d78c777bafa586',
  ),
};
const HARNESS_ADDRESS =
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7' as Cardano.PaymentAddress;
const HARNESS_REWARD_ACCOUNT =
  'stake_test1urc4mvzl2cp4gedl3yq2px7659krmzuzgnl2dpjjgsydmqqxgamj7' as Cardano.RewardAccount;

const HARNESS_ACCOUNT_ID = AccountId('acct-1');
const HARNESS_WALLET_ID = WalletId('wallet-1');
const ORIGIN = 'https://legit-dapp.com';

const harnessBaseAddress =
  Cardano.Address.fromBech32(HARNESS_ADDRESS).asBase()!;
const harnessPaymentKeyHash = harnessBaseAddress.getPaymentCredential()
  .hash as unknown as Ed25519KeyHashHex;

const harnessAddresses = [
  {
    accountId: HARNESS_ACCOUNT_ID,
    address: HARNESS_ADDRESS,
    data: {
      type: AddressType.External,
      index: 0,
      networkId: 0,
      accountIndex: 0,
      rewardAccount: HARNESS_REWARD_ACCOUNT,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    },
  },
];

const harnessAccount = {
  accountId: HARNESS_ACCOUNT_ID,
  walletId: HARNESS_WALLET_ID,
  accountIndex: 0,
  accountType: 'InMemory',
  name: 'Test Account',
  blockchainName: 'Cardano' as const,
  blockchainSpecific: {
    accountIndex: 0,
    chainId: HARNESS_FIXTURE.chainId,
    extendedAccountPublicKey: HARNESS_FIXTURE.extendedAccountPublicKey,
  },
} as unknown as AnyAccount;

const harnessWallet = {
  walletId: HARNESS_WALLET_ID,
  name: 'Test Wallet',
  type: WalletType.InMemory,
  metadata: {},
  accounts: [harnessAccount],
} as unknown as AnyWallet;

const harnessAuthSecret = ByteArray.fromUTF8(PASSWORD) as unknown as Parameters<
  typeof createCardanoKeyAgentFromEncryptedRoot
>[0]['authSecret'];

const withHarnessKeyAgent$: WithCardanoKeyAgent$ = use =>
  from(
    createCardanoKeyAgentFromEncryptedRoot({
      ...HARNESS_FIXTURE,
      authSecret: harnessAuthSecret,
    }),
  ).pipe(switchMap(use));

const harnessSignerFactory = {
  canSign: () => true,
  createTransactionSigner: (context: CardanoTransactionSignerContext) =>
    withCollateralOwnershipGuard(
      new CardanoInMemoryTransactionSigner({
        withKeyAgent$: withHarnessKeyAgent$,
        knownAddresses: context.knownAddresses,
        utxo: context.utxo,
        auth: { authenticate: () => of(true), accessAuthSecret: vi.fn() },
      }),
      context,
    ),
};

type SignTransaction = (
  txCbor: string,
  partialSign: boolean,
  origin: string,
) => Promise<string>;

const captureSignTransaction = (): {
  signTransaction: SignTransaction;
  createWalletApi: () => CardanoDappConnectorApi;
} => {
  const captured: {
    signTransaction?: SignTransaction;
    signingResult$?: Subject<SigningResult>;
    connectorParams?: CardanoDappConnectorApiDependencies;
  } = {};

  const connectCardanoDappConnector = vi.fn(
    (argument: {
      signTransaction: SignTransaction;
      signingResult$: Subject<SigningResult>;
    }) => {
      captured.signTransaction = argument.signTransaction;
      captured.signingResult$ = argument.signingResult$;
      captured.connectorParams =
        argument as unknown as CardanoDappConnectorApiDependencies;
      return EMPTY;
    },
  );

  const actionObservables = {
    cardanoDappConnector: {
      confirmConnect$: new Subject<void>(),
      rejectConnect$: new Subject<void>(),
      confirmSignTx$: new Subject<void>(),
      rejectSignTx$: new Subject<void>(),
      confirmSignData$: new Subject<void>(),
      rejectSignData$: new Subject<void>(),
    },
    views: { viewDisconnected$: new Subject<{ payload: string }>() },
  };

  const stateObservables = {
    views: { selectOpenViews$: of([]) },
    appLock: { isUnlocked$: of(true) },
    dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
    cardanoContext: {
      selectChainId$: of(HARNESS_FIXTURE.chainId),
      selectAvailableAccountUtxos$: of({ [HARNESS_ACCOUNT_ID]: [] }),
      selectCollateralOwnershipUtxos$: of({ [HARNESS_ACCOUNT_ID]: [] }),
      selectAccountUnspendableUtxos$: of({}),
      selectAccountTransactionHistory$: of({}),
      selectRewardAccountDetails$: of({}),
    },
    addresses: { selectAllAddresses$: of(harnessAddresses) },
    cardanoDappConnector: {
      selectSessionAccountByOrigin$: of({ [ORIGIN]: HARNESS_ACCOUNT_ID }),
    },
    wallets: {
      selectActiveNetworkAccounts$: of([harnessAccount]),
      selectAll$: of([harnessWallet]),
    },
  };

  const deps = {
    connectCardanoDappConnector,
    actions: {},
    authenticate: vi.fn().mockReturnValue(of(true)),
    accessAuthSecret: vi.fn(),
    cardanoProvider: {
      submitTx: vi.fn().mockReturnValue(of(Ok('submitted-tx-hash'))),
      resolveInput: vi.fn().mockReturnValue(of(undefined)),
    },
    signerFactory: harnessSignerFactory,
  };

  connectCardanoDappConnectorApi(
    actionObservables as unknown as ActionObservables<never>,
    stateObservables as unknown as StateObservables<never>,
    deps as unknown as SideEffectDependencies & WithLaceContext<never, never>,
  ).subscribe();

  captured.signingResult$!.subscribe();

  return {
    signTransaction: captured.signTransaction!,
    createWalletApi: () =>
      new CardanoDappConnectorApi({
        ...captured.connectorParams!,
        userConfirmationRequest: async () => ({
          outcome: 'confirmed' as const,
        }),
      }),
  };
};

/**
 * Two preview-testnet transactions from the wallet's OWN account, identical
 * except that one returns change. Both register the account's stake key; the
 * no-change variant is what a builder produces when the selected input covers
 * the deposit and fee exactly.
 */
const stakeRegistrationCertificate = {
  __typename: Cardano.CertificateType.StakeRegistration,
  stakeCredential: Cardano.Address.fromBech32(HARNESS_ADDRESS)
    .asBase()!
    .getStakeCredential(),
} as Cardano.Certificate;

const previewCertOnlyNoChange = Serialization.Transaction.fromCore({
  id: Cardano.TransactionId(`${'0'.repeat(63)}2`),
  body: {
    inputs: [{ txId: Cardano.TransactionId(`${'7'.repeat(63)}1`), index: 0 }],
    outputs: [],
    fee: 180_000n,
    certificates: [stakeRegistrationCertificate],
    requiredExtraSignatures: [harnessPaymentKeyHash],
  },
  witness: { signatures: new Map() },
}).toCbor();

const previewCertWithChange = Serialization.Transaction.fromCore({
  id: Cardano.TransactionId(`${'0'.repeat(63)}3`),
  body: {
    inputs: [{ txId: Cardano.TransactionId(`${'7'.repeat(63)}1`), index: 0 }],
    outputs: [{ address: HARNESS_ADDRESS, value: { coins: 1_500_000n } }],
    fee: 180_000n,
    certificates: [stakeRegistrationCertificate],
    requiredExtraSignatures: [harnessPaymentKeyHash],
  },
  witness: { signatures: new Map() },
}).toCbor();

describe('LW-15469 contrarian: the real extension path, A/B on one change output', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('both transactions are the wallet’s own preview-testnet transactions', () => {
    expect(HARNESS_FIXTURE.chainId.networkId).toBe(Cardano.NetworkId.Testnet);
    const noChange = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(previewCertOnlyNoChange),
    ).toCore().body;
    const withChange = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(previewCertWithChange),
    ).toCore().body;
    expect(noChange.outputs).toHaveLength(0);
    expect(withChange.outputs).toHaveLength(1);
    expect(withChange.outputs[0].address).toBe(HARNESS_ADDRESS);
    expect(noChange.certificates).toEqual(withChange.certificates);
  });

  it('SIGNS the variant that returns change to the wallet’s preview address', async () => {
    const { signTransaction } = captureSignTransaction();
    const witnessSetCbor = await signTransaction(
      previewCertWithChange,
      true,
      ORIGIN,
    );
    const vkeys = Serialization.TransactionWitnessSet.fromCbor(
      witnessSetCbor as Parameters<
        typeof Serialization.TransactionWitnessSet.fromCbor
      >[0],
    ).toCore().signatures?.size;
    // eslint-disable-next-line no-console
    console.log('SIGNED with-change variant, vkey witnesses:', vkeys);
    expect(vkeys).toBeGreaterThan(0);
  });

  it('REFUSES the identical transaction without the change output', async () => {
    const { signTransaction } = captureSignTransaction();
    await expect(
      signTransaction(previewCertOnlyNoChange, true, ORIGIN),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  it('refuses it in the CIP-30 pre-consent check too', async () => {
    const { createWalletApi } = captureSignTransaction();
    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };
    await expect(
      createWalletApi().signTx(previewCertOnlyNoChange, true, sender),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });
});

// A CBOR round-trip for the governance shapes, so the refusals above cannot be
// dismissed as "that body would never decode anyway": these serialize and
// decode cleanly with the pinned @cardano-sdk/core, and are then refused.
describe('LW-15469 contrarian: zero-output governance shapes survive CBOR', () => {
  const roundTrip = (txBody: Partial<Cardano.TxBody>) =>
    Serialization.Transaction.fromCore({
      id: Cardano.TransactionId(`${'0'.repeat(63)}4`),
      body: {
        inputs: [
          { txId: Cardano.TransactionId(`${'7'.repeat(63)}1`), index: 0 },
        ],
        outputs: [],
        fee: 180_000n,
        ...txBody,
      },
      witness: { signatures: new Map() },
    } as Cardano.Tx).toCbor();

  it('a DRep vote-only transaction decodes, has no outputs, and is refused', () => {
    const cbor = roundTrip({
      votingProcedures: [
        {
          voter: {
            __typename: Cardano.VoterType.dRepKeyHash,
            credential: {
              hash: Hash28ByteBase16('c'.repeat(56)),
              type: Cardano.CredentialType.KeyHash,
            },
          },
          votes: [
            {
              actionId: {
                id: Cardano.TransactionId('b'.repeat(64)),
                actionIndex: 0,
              },
              votingProcedure: { vote: Cardano.Vote.yes },
            },
          ],
        } as unknown as Cardano.VotingProcedures[number],
      ],
    });

    const decoded = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(cbor),
    ).toCore().body;
    expect(decoded.outputs).toHaveLength(0);
    expect(decoded.votingProcedures).toHaveLength(1);
    expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(false);
  });

  it('a stake-deregistration-only transaction decodes, has no outputs, and is refused', () => {
    const cbor = roundTrip({
      certificates: [
        {
          __typename: Cardano.CertificateType.StakeDeregistration,
          stakeCredential: {
            hash: Hash28ByteBase16('c'.repeat(56)),
            type: Cardano.CredentialType.KeyHash,
          },
        } as Cardano.Certificate,
      ],
    });

    const decoded = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(cbor),
    ).toCore().body;
    expect(decoded.outputs).toHaveLength(0);
    expect(decoded.certificates).toHaveLength(1);
    expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(false);
  });
});
