import { Cardano, Serialization } from '@cardano-sdk/core';
import { Ed25519PublicKey, Ed25519Signature } from '@cardano-sdk/crypto';
import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromEncryptedRoot,
} from '@lace-contract/cardano-context';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { from, of, Subject, switchMap } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TxSignErrorCode } from '../src/common/api-error';
import { handleSignTxConfirmation } from '../src/mobile/store/side-effects';

import type { WebViewResponse } from '../src/common/store/slice';
import type { Ed25519KeyHashHex, Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { HexBlob } from '@cardano-sdk/util';
import type { WithCardanoKeyAgent$ } from '@lace-contract/cardano-context';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

// Native/RN-only modules the mobile side-effects module imports at load time.
// @cardano-sdk/crypto and @cardano-sdk/core are deliberately left real so the
// in-memory signer performs actual Ed25519 signing over a real CBOR round-trip.
vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { navigate: vi.fn(), closeSheet: vi.fn() },
  SheetRoutes: {},
}));
vi.mock('../src/mobile/services/cip30-message-handler', () => ({
  handleCip30Message: vi.fn(),
}));

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
const REQUEST_ID = 'req-1';

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
// from the context the handler assembles, so a regression that dropped
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

const requireSig = (keyHash: Ed25519KeyHashHex): Cardano.NativeScript => ({
  __type: Cardano.ScriptType.Native,
  kind: Cardano.NativeScriptKind.RequireSignature,
  keyHash,
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

// Drives the real handleSignTxConfirmation side effect end-to-end and returns the
// WebViewResponse it hands back to the dApp WebView.
const runConfirmation = async (
  txCbor: string,
  partialSign: boolean,
  overrides: {
    localUtxos?: Cardano.Utxo[];
    account?: AnyAccount;
    wallet?: AnyWallet;
    signerFactory?: ReturnType<typeof stubSignerFactory>;
  } = {},
): Promise<WebViewResponse> => {
  const localUtxos = overrides.localUtxos ?? [];
  const accountEntity = overrides.account ?? account;
  const walletEntity = overrides.wallet ?? wallet;
  const confirmSignTx$ = new Subject<void>();
  const actions = {
    cardanoDappConnector: {
      setWebViewResponse: vi.fn((response: WebViewResponse) => ({
        type: 'setWebViewResponse',
        payload: response,
      })),
      clearPendingSignTxRequest: vi.fn(() => ({
        type: 'clearPendingSignTxRequest',
      })),
    },
  };

  const actionObservables = { cardanoDappConnector: { confirmSignTx$ } };
  const stateObservables = {
    cardanoDappConnector: {
      selectPendingSignTxRequest$: of({
        requestId: REQUEST_ID,
        dappOrigin: ORIGIN,
        txHex: txCbor,
        partialSign,
      }),
      selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
    },
    wallets: {
      selectActiveNetworkAccounts$: of([accountEntity]),
      selectAll$: of([walletEntity]),
    },
    addresses: { selectAllAddresses$: of(allAddresses) },
    cardanoContext: {
      selectChainId$: of(FIXTURE.chainId),
      selectAvailableAccountUtxos$: of({ [ACCOUNT_ID]: localUtxos }),
    },
  };
  const deps = {
    actions,
    accessAuthSecret: vi.fn(),
    authenticate: vi.fn().mockReturnValue(of(true)),
    signerFactory: overrides.signerFactory ?? realSignerFactory,
    cardanoProvider: { resolveInput: vi.fn() },
  };

  const emitted: { type: string; payload?: WebViewResponse }[] = [];
  const subscription = handleSignTxConfirmation(
    actionObservables as unknown as Parameters<
      typeof handleSignTxConfirmation
    >[0],
    stateObservables as unknown as Parameters<
      typeof handleSignTxConfirmation
    >[1],
    deps as unknown as Parameters<typeof handleSignTxConfirmation>[2],
  ).subscribe(action =>
    emitted.push(action as { type: string; payload?: WebViewResponse }),
  );

  confirmSignTx$.next();
  await vi.waitFor(() => {
    expect(emitted.some(a => a.type === 'setWebViewResponse')).toBe(true);
  });
  subscription.unsubscribe();

  return emitted.find(a => a.type === 'setWebViewResponse')!.payload!;
};

describe('dApp-connector mobile signTx — native-script witness end-to-end (commit 7a23ff29)', () => {
  it('returns the wallet key witness produced only via a native script to the dApp', async () => {
    const txCbor = buildScriptTxCbor([requireSig(ownPaymentKeyHash)]);

    const response = await runConfirmation(txCbor, true);

    expect(response.success).toBe(true);
    if (!response.success) return;

    // The CIP-30 witness set handed back to the WebView must carry the wallet's
    // script-derived signature, and it must be a real signature over the tx body.
    const signatures = Serialization.TransactionWitnessSet.fromCbor(
      response.result as HexBlob,
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
  });

  it('rejects a partial sign with ProofGeneration when the script needs a key the wallet does not own', async () => {
    const txCbor = buildScriptTxCbor([requireSig(foreignKeyHash)]);

    const response = await runConfirmation(txCbor, true);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
  });

  it('fully signs a tx whose native script the wallet keys satisfy alone', async () => {
    const txCbor = buildScriptTxCbor([requireSig(ownPaymentKeyHash)]);

    const response = await runConfirmation(txCbor, false, {
      localUtxos: [ownInputUtxo],
    });

    expect(response.success).toBe(true);
    if (!response.success) return;

    const signatures = Serialization.TransactionWitnessSet.fromCbor(
      response.result as HexBlob,
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
  });

  it('rejects a full sign with ProofGeneration when the script needs a key the wallet does not own', async () => {
    const txCbor = buildScriptTxCbor([requireSig(foreignKeyHash)]);

    const response = await runConfirmation(txCbor, false, {
      localUtxos: [ownInputUtxo],
    });

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
  });

  it('rejects a Trezor full sign up front with ProofGeneration even when own keys satisfy the script, without creating a signer', async () => {
    const signerFactory = stubSignerFactory();
    const txCbor = buildScriptTxCbor([requireSig(ownPaymentKeyHash)]);

    const response = await runConfirmation(txCbor, false, {
      localUtxos: [ownInputUtxo],
      ...hardwareWalletEntities(WalletType.HardwareTrezor),
      signerFactory,
    });

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
    expect(signerFactory.createTransactionSigner).not.toHaveBeenCalled();
  });
});

describe('dApp-connector mobile signTx - chained transactions spending own mempool outputs', () => {
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
  ): string =>
    Serialization.Transaction.fromCore({
      id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
      body: {
        inputs,
        outputs: [{ address: outputAddress, value: { coins: 1_000_000n } }],
        fee: 170_000n,
      },
      witness: { signatures: new Map() },
    }).toCbor();

  const txIdOf = (cbor: string): Cardano.TransactionId =>
    Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor)).getId();

  it('rejects the chained tx when the source tx was never signed here', async () => {
    const unknownSource = buildPlainTxCbor([
      { txId: Cardano.TransactionId(`${'0'.repeat(63)}8`), index: 0 },
    ]);
    const tx2 = buildPlainTxCbor([{ txId: txIdOf(unknownSource), index: 0 }]);

    const response = await runConfirmation(tx2, true);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
  });

  it('witnesses a chained tx spending an output of a previously signed tx', async () => {
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    const tx1Response = await runConfirmation(tx1, true, {
      localUtxos: [ownUtxo],
    });
    expect(tx1Response.success).toBe(true);

    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);
    const response = await runConfirmation(tx2, true);

    expect(response.success).toBe(true);
    if (!response.success) return;
    const signatures = Serialization.TransactionWitnessSet.fromCbor(
      response.result as HexBlob,
    ).toCore().signatures;
    expect(signatures.size).toBe(1);
    const [[vkeyHex, signatureHex]] = signatures;
    const publicKey = Ed25519PublicKey.fromHex(vkeyHex);
    expect(publicKey.hash().hex()).toBe(ownPaymentKeyHash);
    const txBodyHash = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(tx2),
    )
      .body()
      .hash();
    expect(
      publicKey.verify(Ed25519Signature.fromHex(signatureHex), txBodyHash),
    ).toBe(true);
  });

  it('full-sign of a chained tx passes the foreign-signature guard', async () => {
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT]);
    const tx1Response = await runConfirmation(tx1, true, {
      localUtxos: [ownUtxo],
    });
    expect(tx1Response.success).toBe(true);

    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);
    const response = await runConfirmation(tx2, false);

    expect(response.success).toBe(true);
  });

  it('full-sign of a chained tx spending a foreign-address output still rejects', async () => {
    const tx1 = buildPlainTxCbor([PREV_OUTPOINT], FOREIGN_ADDRESS);
    const tx1Response = await runConfirmation(tx1, true, {
      localUtxos: [ownUtxo],
    });
    expect(tx1Response.success).toBe(true);

    const tx2 = buildPlainTxCbor([{ txId: txIdOf(tx1), index: 0 }]);
    const response = await runConfirmation(tx2, false);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
  });
});
