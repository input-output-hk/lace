import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  Ed25519PublicKey,
  Ed25519PublicKeyHex,
  Ed25519Signature,
  Ed25519SignatureHex,
} from '@cardano-sdk/crypto';
import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromEncryptedRoot,
} from '@lace-contract/cardano-context';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, HexBytes, Ok } from '@lace-lib/util';
import { EMPTY, from, of, Subject, switchMap } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectCardanoDappConnectorApi } from '../src/browser/store/side-effects';
import { TxSignErrorCode } from '../src/common/api-error';
import { CardanoDappConnectorApi } from '../src/common/store/dependencies/cardano-dapp-connector-api';

import type { SigningResult } from '../src/browser/store/util';
import type { SenderContext } from '../src/browser/types';
import type { CardanoDappConnectorApiDependencies } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import type { Ed25519KeyHashHex, Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { HexBlob } from '@cardano-sdk/util';
import type { WithCardanoKeyAgent$ } from '@lace-contract/cardano-context';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';
import type { Runtime } from 'webextension-polyfill';

// signTx$/signData$/detectViewClosure only matter for the popup flow, which this
// test bypasses by invoking the captured signTransaction wrapper directly. They
// are stubbed so subscribing to the side effect does not touch view/popup logic.
// Crucially, @cardano-sdk/crypto and @cardano-sdk/core are NOT mocked here, so the
// in-memory signer performs real Ed25519 signing over a real CBOR round-trip.
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

// Same real preview-testnet fixture as cardano-context's signing regression test:
// the root key is encrypted under the UTF-8 bytes of PASSWORD, so real signing
// only succeeds via the fixture's decrypt.
const PASSWORD = 'ComplexPassword2024!';
const FIXTURE = {
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 } as Cardano.ChainId,
  extendedAccountPublicKey:
    'a79619cd18f11202741213ab003dd40bffb2a31e8ad1bc5aab6f02be3c8aa9218d515cb54181fb2f5fc3af329e80949c082fb52f7b07e359bd7835a6762148bf' as Bip32PublicKeyHex,
  encryptedRootPrivateKey: HexBytes(
    '1a671129801c208c3c5ffa99ae85cf36d5a323144a427f17bb3a1b50cc36099752ca8b045138bce43f0636f2bb45380e0912c85a0834c26f632011c39c7a71c3e8543490a8656c2ebdb40d375dca2eb9e4a652a637631890d4776d5ad7319abd1d0bd3c1836a8d914050f28c690441bdf00d2b15416e0692f057e9f2205401948235f7efa7598e7fc737fa52066299c7cfc96ebf80d78c777bafa586',
  ),
};
const FIXTURE_ADDRESS =
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7' as Cardano.PaymentAddress;
const FIXTURE_REWARD_ACCOUNT =
  'stake_test1urc4mvzl2cp4gedl3yq2px7659krmzuzgnl2dpjjgsydmqqxgamj7' as Cardano.RewardAccount;

const ACCOUNT_ID = AccountId('acct-1');
const WALLET_ID = WalletId('wallet-1');
const ORIGIN = 'https://test-dapp.com';

const ownPaymentKeyHash = Cardano.Address.fromBech32(FIXTURE_ADDRESS)
  .asBase()!
  .getPaymentCredential().hash as unknown as Ed25519KeyHashHex;
const foreignKeyHash = 'f'.repeat(56) as unknown as Ed25519KeyHashHex;

// The @lace-contract/addresses shape transformToGroupedAddresses consumes; its
// `data` maps 1:1 onto the wallet's GroupedAddress (FIXTURE_ADDRESS).
const allAddresses = [
  {
    accountId: ACCOUNT_ID,
    address: FIXTURE_ADDRESS,
    data: {
      type: AddressType.External,
      index: 0,
      networkId: 0,
      accountIndex: 0,
      rewardAccount: FIXTURE_REWARD_ACCOUNT,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    },
  },
];

const account = {
  accountId: ACCOUNT_ID,
  walletId: WALLET_ID,
  accountIndex: 0,
  accountType: 'InMemory',
  name: 'Test Account',
  blockchainName: 'Cardano' as const,
  blockchainSpecific: {
    accountIndex: 0,
    chainId: FIXTURE.chainId,
    extendedAccountPublicKey: FIXTURE.extendedAccountPublicKey,
  },
} as unknown as AnyAccount;

const wallet = {
  walletId: WALLET_ID,
  name: 'Test Wallet',
  type: WalletType.InMemory,
  metadata: {},
  accounts: [account],
} as unknown as AnyWallet;

const hardwareWalletEntities = (
  type: WalletType.HardwareLedger | WalletType.HardwareTrezor,
): { account: AnyAccount; wallet: AnyWallet } => {
  const hardwareAccount = {
    ...account,
    accountType: type,
  } as unknown as AnyAccount;
  const hardwareWallet = {
    walletId: WALLET_ID,
    name: 'Test Hardware Wallet',
    type,
    metadata: {},
    blockchainSpecific: {},
    accounts: [hardwareAccount],
  } as unknown as AnyWallet;
  return { account: hardwareAccount, wallet: hardwareWallet };
};

const authSecret = ByteArray.fromUTF8(PASSWORD) as unknown as Parameters<
  typeof createCardanoKeyAgentFromEncryptedRoot
>[0]['authSecret'];

const withKeyAgent$: WithCardanoKeyAgent$ = use =>
  from(createCardanoKeyAgentFromEncryptedRoot({ ...FIXTURE, authSecret })).pipe(
    switchMap(use),
  );

// Real signer factory: builds the production CardanoInMemoryTransactionSigner
// from the context the wrapper assembles, so a wrapper regression that dropped
// knownAddresses (the only route to a witness for a script-only key) would yield
// zero witnesses and fail these tests rather than passing silently.
const realSignerFactory = {
  canSign: () => true,
  createTransactionSigner: (context: {
    knownAddresses: GroupedAddress[];
    utxo: Cardano.Utxo[];
  }) =>
    new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses: context.knownAddresses,
      utxo: context.utxo,
      auth: { authenticate: () => of(true), accessAuthSecret: vi.fn() },
    }),
};

/** Records signer creation without touching a real signer or device. */
const stubSignerFactory = () => ({
  canSign: () => true,
  createTransactionSigner: vi.fn(() => ({
    sign: ({ serializedTx }: { serializedTx: string }) => of({ serializedTx }),
  })),
});

const buildScriptTxCbor = (scripts: Cardano.Script[]): string => {
  const tx: Cardano.Tx = {
    id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
    body: {
      inputs: [{ txId: Cardano.TransactionId(`${'0'.repeat(63)}2`), index: 0 }],
      outputs: [{ address: FIXTURE_ADDRESS, value: { coins: 1_000_000n } }],
      fee: 170_000n,
    },
    witness: { signatures: new Map(), scripts },
  };
  return Serialization.Transaction.fromCore(tx).toCbor();
};

// Local UTXO backing the input buildScriptTxCbor spends, so a full sign is not
// rejected for foreign inputs and the gate decision hinges on the scripts.
const ownInputUtxo: Cardano.Utxo = [
  {
    txId: Cardano.TransactionId(`${'0'.repeat(63)}2`),
    index: 0,
    address: FIXTURE_ADDRESS,
  },
  { address: FIXTURE_ADDRESS, value: { coins: 10_000_000n } },
];

const requireSig = (keyHash: Ed25519KeyHashHex): Cardano.NativeScript => ({
  __type: Cardano.ScriptType.Native,
  kind: Cardano.NativeScriptKind.RequireSignature,
  keyHash,
});

type SignTransaction = (
  txCbor: string,
  partialSign: boolean,
  origin: string,
) => Promise<string>;

// Drives the real production signTransaction wrapper: subscribes to
// connectCardanoDappConnectorApi, captures the wrapper the SW hands to the
// connector, and returns it alongside the signing-result stream.
// createWalletApi builds the CIP-30 API from the same captured wiring, so
// tests can also drive the API's sign pre-check that runs before the popup.
const captureSignTransaction = (
  localUtxos: Cardano.Utxo[] = [],
  overrides: {
    account?: AnyAccount;
    wallet?: AnyWallet;
    signerFactory?: ReturnType<typeof stubSignerFactory>;
  } = {},
): {
  signTransaction: SignTransaction;
  submitTransaction: (cbor: string) => Promise<string>;
  createWalletApi: () => CardanoDappConnectorApi;
  signingResults: SigningResult[];
} => {
  const accountEntity = overrides.account ?? account;
  const walletEntity = overrides.wallet ?? wallet;
  const captured: {
    signTransaction?: SignTransaction;
    submitTransaction?: (cbor: string) => Promise<string>;
    signingResult$?: Subject<SigningResult>;
    connectorParams?: CardanoDappConnectorApiDependencies;
  } = {};

  const connectCardanoDappConnector = vi.fn(
    (argument: {
      signTransaction: SignTransaction;
      submitTransaction: (cbor: string) => Promise<string>;
      signingResult$: Subject<SigningResult>;
    }) => {
      captured.signTransaction = argument.signTransaction;
      captured.submitTransaction = argument.submitTransaction;
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
      selectChainId$: of(FIXTURE.chainId),
      selectAvailableAccountUtxos$: of({ [ACCOUNT_ID]: localUtxos }),
      selectAccountUnspendableUtxos$: of({}),
      selectAccountTransactionHistory$: of({}),
      selectRewardAccountDetails$: of({}),
    },
    addresses: { selectAllAddresses$: of(allAddresses) },
    cardanoDappConnector: {
      selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
    },
    wallets: {
      selectActiveNetworkAccounts$: of([accountEntity]),
      selectAll$: of([walletEntity]),
    },
  };

  const deps = {
    connectCardanoDappConnector,
    actions: {},
    authenticate: vi.fn().mockReturnValue(of(true)),
    accessAuthSecret: vi.fn(),
    cardanoProvider: {
      submitTx: vi.fn().mockReturnValue(of(Ok('submitted-tx-hash'))),
      resolveInput: vi.fn(),
    },
    signerFactory: overrides.signerFactory ?? realSignerFactory,
  };

  connectCardanoDappConnectorApi(
    actionObservables as unknown as ActionObservables<never>,
    stateObservables as unknown as StateObservables<never>,
    deps as unknown as SideEffectDependencies & WithLaceContext<never, never>,
  ).subscribe();

  const signingResults: SigningResult[] = [];
  captured.signingResult$!.subscribe(result => signingResults.push(result));

  return {
    signTransaction: captured.signTransaction!,
    submitTransaction: captured.submitTransaction!,
    createWalletApi: () =>
      new CardanoDappConnectorApi({
        ...captured.connectorParams!,
        userConfirmationRequest: async () => ({ isConfirmed: true }),
      }),
    signingResults,
  };
};

describe('dApp-connector signTx — native-script witness end-to-end (commit 7a23ff29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the wallet key witness produced only via a native script to the dApp', async () => {
    const { signTransaction, signingResults } = captureSignTransaction();
    const txCbor = buildScriptTxCbor([requireSig(ownPaymentKeyHash)]);

    const witnessSetCbor = await signTransaction(txCbor, true, ORIGIN);

    // The CIP-30 witness set handed back to the dApp must carry the wallet's
    // script-derived signature, and it must be a real signature over the tx body.
    const signatures = Serialization.TransactionWitnessSet.fromCbor(
      witnessSetCbor as unknown as HexBlob,
    ).toCore().signatures;
    expect(signatures.size).toBe(1);

    const txBodyHash = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(txCbor),
    )
      .body()
      .hash();
    const [[vkeyHex, signatureHex]] = signatures;
    const publicKey = Ed25519PublicKey.fromHex(vkeyHex);

    expect(publicKey.hash().hex()).toBe(ownPaymentKeyHash);
    expect(
      publicKey.verify(Ed25519Signature.fromHex(signatureHex), txBodyHash),
    ).toBe(true);
    expect(signingResults).toEqual([{ type: 'success' }]);
  });

  it('fully signs a tx whose native script the wallet keys satisfy alone', async () => {
    const { signTransaction, signingResults } = captureSignTransaction([
      ownInputUtxo,
    ]);
    const txCbor = buildScriptTxCbor([requireSig(ownPaymentKeyHash)]);

    const witnessSetCbor = await signTransaction(txCbor, false, ORIGIN);

    const signatures = Serialization.TransactionWitnessSet.fromCbor(
      witnessSetCbor as unknown as HexBlob,
    ).toCore().signatures;
    expect(signatures.size).toBe(1);

    const txBodyHash = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(txCbor),
    )
      .body()
      .hash();
    const [[vkeyHex, signatureHex]] = signatures;
    const publicKey = Ed25519PublicKey.fromHex(vkeyHex);

    expect(publicKey.hash().hex()).toBe(ownPaymentKeyHash);
    expect(
      publicKey.verify(Ed25519Signature.fromHex(signatureHex), txBodyHash),
    ).toBe(true);
    expect(signingResults).toEqual([{ type: 'success' }]);
  });

  it('rejects a full sign with ProofGeneration when the script needs a key the wallet does not own', async () => {
    const { signTransaction, signingResults } = captureSignTransaction([
      ownInputUtxo,
    ]);
    const txCbor = buildScriptTxCbor([requireSig(foreignKeyHash)]);

    await expect(signTransaction(txCbor, false, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
    expect(signingResults).toEqual([]);
  });

  it('rejects a partial sign with ProofGeneration when the script needs a key the wallet does not own', async () => {
    const { signTransaction, signingResults } = captureSignTransaction();
    const txCbor = buildScriptTxCbor([requireSig(foreignKeyHash)]);

    await expect(signTransaction(txCbor, true, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
    expect(signingResults).toEqual([{ type: 'error', hwErrorKeys: undefined }]);
  });

  it('returns only the wallet witness for a multisig tx that already carries a cosigner signature', async () => {
    const { signTransaction } = captureSignTransaction();

    // A cosigner's pre-existing witness on the incoming tx (its vkey backs the
    // foreign branch of the 2-of-2 script). Synthetic bytes are fine: the signer
    // never verifies incoming witnesses — it replaces the vkey set with its own.
    const cosignerVkeyHex = Ed25519PublicKeyHex('1'.repeat(64));
    const cosignerSignatureHex = Ed25519SignatureHex('2'.repeat(128));
    const cosignerKeyHash = Ed25519PublicKey.fromHex(cosignerVkeyHex)
      .hash()
      .hex() as unknown as Ed25519KeyHashHex;

    const tx: Cardano.Tx = {
      id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
      body: {
        inputs: [
          { txId: Cardano.TransactionId(`${'0'.repeat(63)}2`), index: 0 },
        ],
        outputs: [{ address: FIXTURE_ADDRESS, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: {
        signatures: new Map([
          [cosignerVkeyHex, cosignerSignatureHex],
        ]) as unknown as Cardano.Tx['witness']['signatures'],
        scripts: [
          {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireNOf,
            required: 2,
            scripts: [
              requireSig(cosignerKeyHash),
              requireSig(ownPaymentKeyHash),
            ],
          },
        ],
      },
    };
    const txCbor = Serialization.Transaction.fromCore(tx).toCbor();

    const witnessSetCbor = await signTransaction(txCbor, true, ORIGIN);

    // The CIP-30 diff returns only the wallet's new witness; the cosigner's
    // incoming signature is neither echoed back nor counted by the gate.
    const signatures = Serialization.TransactionWitnessSet.fromCbor(
      witnessSetCbor as unknown as HexBlob,
    ).toCore().signatures;
    expect(signatures.size).toBe(1);
    expect([...signatures.keys()] as string[]).not.toContain(cosignerVkeyHex);

    const txBodyHash = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(txCbor),
    )
      .body()
      .hash();
    const [[vkeyHex, signatureHex]] = signatures;
    const publicKey = Ed25519PublicKey.fromHex(vkeyHex);

    expect(publicKey.hash().hex()).toBe(ownPaymentKeyHash);
    expect(
      publicKey.verify(Ed25519Signature.fromHex(signatureHex), txBodyHash),
    ).toBe(true);
  });

  it('rejects a Ledger full sign up front with ProofGeneration even when own keys satisfy the script, without creating a signer', async () => {
    const signerFactory = stubSignerFactory();
    const { signTransaction, signingResults } = captureSignTransaction(
      [ownInputUtxo],
      {
        ...hardwareWalletEntities(WalletType.HardwareLedger),
        signerFactory,
      },
    );
    const txCbor = buildScriptTxCbor([requireSig(ownPaymentKeyHash)]);

    await expect(signTransaction(txCbor, false, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
    expect(signerFactory.createTransactionSigner).not.toHaveBeenCalled();
    expect(signingResults).toEqual([]);
  });

  it('lets a Trezor full sign of an own-key-satisfiable script past the gate and creates the signer', async () => {
    const signerFactory = stubSignerFactory();
    const { signTransaction } = captureSignTransaction([ownInputUtxo], {
      ...hardwareWalletEntities(WalletType.HardwareTrezor),
      signerFactory,
    });
    const txCbor = buildScriptTxCbor([requireSig(ownPaymentKeyHash)]);

    await expect(signTransaction(txCbor, false, ORIGIN)).resolves.toBeDefined();
    expect(signerFactory.createTransactionSigner).toHaveBeenCalledTimes(1);
  });
});

describe('dApp-connector signTx - chained transactions spending own mempool outputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const PREV_OUTPOINT: Cardano.TxIn = {
    txId: Cardano.TransactionId(`${'0'.repeat(63)}9`),
    index: 0,
  };
  const ownUtxo: Cardano.Utxo = [
    { ...PREV_OUTPOINT, address: FIXTURE_ADDRESS },
    { address: FIXTURE_ADDRESS, value: { coins: 10_000_000n } },
  ];

  const FOREIGN_ADDRESS =
    'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq' as Cardano.PaymentAddress;

  const buildPlainTxCbor = (
    inputs: Cardano.TxIn[],
    outputAddress: Cardano.PaymentAddress = FIXTURE_ADDRESS,
    collaterals?: Cardano.TxIn[],
  ): string =>
    Serialization.Transaction.fromCore({
      id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
      body: {
        inputs,
        ...(collaterals ? { collaterals } : {}),
        outputs: [{ address: outputAddress, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: { signatures: new Map() },
    }).toCbor();

  const txIdOf = (cbor: string): Cardano.TransactionId =>
    Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor)).getId();

  const expectSingleOwnWitness = (witnessSetCbor: string, txCbor: string) => {
    const signatures = Serialization.TransactionWitnessSet.fromCbor(
      witnessSetCbor as unknown as HexBlob,
    ).toCore().signatures;
    expect(signatures.size).toBe(1);
    const [[vkeyHex, signatureHex]] = signatures;
    const publicKey = Ed25519PublicKey.fromHex(vkeyHex);
    expect(publicKey.hash().hex()).toBe(ownPaymentKeyHash);
    const txBodyHash = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(txCbor),
    )
      .body()
      .hash();
    expect(
      publicKey.verify(Ed25519Signature.fromHex(signatureHex), txBodyHash),
    ).toBe(true);
  };

  it('rejects the chained tx when the source tx was never signed or submitted here', async () => {
    const { signTransaction } = captureSignTransaction();
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);

    await expect(signTransaction(tx2, true, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  it('witnesses a chained tx spending an output of a previously submitted tx', async () => {
    const { signTransaction, submitTransaction } = captureSignTransaction();
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    await submitTransaction(tx1);
    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);

    const witnessSetCbor = await signTransaction(tx2, true, ORIGIN);

    expectSingleOwnWitness(witnessSetCbor, tx2);
  });

  it('witnesses a chained tx spending an output of a previously signed tx', async () => {
    const { signTransaction } = captureSignTransaction([ownUtxo]);
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    await signTransaction(tx1, true, ORIGIN);
    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);

    const witnessSetCbor = await signTransaction(tx2, true, ORIGIN);

    expectSingleOwnWitness(witnessSetCbor, tx2);
  });

  it('full-sign of a chained tx passes the foreign-signature guard', async () => {
    const { signTransaction, submitTransaction } = captureSignTransaction();
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    await submitTransaction(tx1);
    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);

    const witnessSetCbor = await signTransaction(tx2, false, ORIGIN);

    expectSingleOwnWitness(witnessSetCbor, tx2);
  });

  it('full-sign of a chained tx using a chained own output as collateral passes the guard', async () => {
    const { signTransaction, submitTransaction } = captureSignTransaction();
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    await submitTransaction(tx1);
    const tx2 = buildPlainTxCbor(
      [{ txId: txIdOf(tx1), index: 0 }],
      FIXTURE_ADDRESS,
      [{ txId: txIdOf(tx1), index: 0 }],
    );

    const witnessSetCbor = await signTransaction(tx2, false, ORIGIN);

    expectSingleOwnWitness(witnessSetCbor, tx2);
  });

  it('full-sign of a chained tx spending a foreign-address output still rejects', async () => {
    const { signTransaction, submitTransaction } = captureSignTransaction();
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT], FOREIGN_ADDRESS);
    await submitTransaction(tx1);
    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);

    await expect(signTransaction(tx2, false, ORIGIN)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  const SENDER: SenderContext = {
    sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
  };

  it('full-sign of a chained tx passes the CIP-30 API pre-check', async () => {
    const { submitTransaction, createWalletApi } = captureSignTransaction();
    const walletApi = createWalletApi();
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    await submitTransaction(tx1);
    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);

    const witnessSetCbor = await walletApi.signTx(tx2, false, SENDER);

    expectSingleOwnWitness(witnessSetCbor, tx2);
  });

  it('CIP-30 API pre-check still rejects full-sign when the source tx was never cached', async () => {
    const { createWalletApi } = captureSignTransaction();
    const walletApi = createWalletApi();
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);

    await expect(walletApi.signTx(tx2, false, SENDER)).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });
});
