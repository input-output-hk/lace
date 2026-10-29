/**
 * Does `partialSign: true` still buy a dApp a signature it should not get,
 * now that the network-binding rule refuses cross-network bodies?
 *
 * The foreign-signature gate sits inside `if (!partialSign)` in both signing
 * paths, so a partial-sign request skips it. Every body below is correctly
 * bound to the wallet's own network (preview testnet), so network binding has
 * nothing to say about them — which isolates the partial-sign branch as the
 * only thing that differs between the pairs.
 *
 * Crypto is NOT mocked: each witness asserted below is a real Ed25519
 * signature over the real body hash of the exact CBOR the dApp submitted, and
 * the signing key is checked against the credential it claims to be.
 */
import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { AddressType } from '@cardano-sdk/key-management';
import { HexBlob } from '@cardano-sdk/util';
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

import { isBoundToNetwork } from './support/network-binding-verdict';

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
const ORIGIN = 'https://malicious-dapp.com';

const fixtureBaseAddress =
  Cardano.Address.fromBech32(FIXTURE_ADDRESS).asBase()!;
const ownPaymentKeyHash = fixtureBaseAddress.getPaymentCredential()
  .hash as unknown as Ed25519KeyHashHex;

const keyHashCredential = (byte: string) => ({
  hash: Hash28ByteBase16(byte.repeat(56)),
  type: Cardano.CredentialType.KeyHash,
});

// The other party to the multi-sig: a key hash the wallet does not own and
// cannot derive.
const foreignKeyHash = Hash28ByteBase16(
  'e'.repeat(56),
) as unknown as Ed25519KeyHashHex;

const attackerTestnetAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  keyHashCredential('a'),
  keyHashCredential('b'),
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

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

const authSecret = ByteArray.fromUTF8(PASSWORD) as unknown as Parameters<
  typeof createCardanoKeyAgentFromEncryptedRoot
>[0]['authSecret'];

const withKeyAgent$: WithCardanoKeyAgent$ = use =>
  from(createCardanoKeyAgentFromEncryptedRoot({ ...FIXTURE, authSecret })).pipe(
    switchMap(use),
  );

const realSignerFactory = {
  canSign: () => true,
  createTransactionSigner: (context: CardanoTransactionSignerContext) =>
    withCollateralOwnershipGuard(
      new CardanoInMemoryTransactionSigner({
        withKeyAgent$,
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

const captureSignTransaction = (
  localUtxos: Cardano.Utxo[] = [],
): {
  signTransaction: SignTransaction;
  createWalletApi: () => CardanoDappConnectorApi;
  signingResults: SigningResult[];
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
      selectChainId$: of(FIXTURE.chainId),
      selectAvailableAccountUtxos$: of({ [ACCOUNT_ID]: localUtxos }),
      selectCollateralOwnershipUtxos$: of({ [ACCOUNT_ID]: localUtxos }),
      selectAccountUnspendableUtxos$: of({}),
      selectAccountTransactionHistory$: of({}),
      selectRewardAccountDetails$: of({}),
    },
    addresses: { selectAllAddresses$: of(allAddresses) },
    cardanoDappConnector: {
      selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
    },
    wallets: {
      selectActiveNetworkAccounts$: of([account]),
      selectAll$: of([wallet]),
    },
  };

  const deps = {
    connectCardanoDappConnector,
    actions: {},
    authenticate: vi.fn().mockReturnValue(of(true)),
    accessAuthSecret: vi.fn(),
    cardanoProvider: {
      submitTx: vi.fn().mockReturnValue(of(Ok('submitted-tx-hash'))),
      // The co-signer's input belongs to a stranger; no data source of ours
      // can resolve it, which is precisely why the wallet reads it as foreign.
      resolveInput: vi.fn().mockReturnValue(of(undefined)),
    },
    signerFactory: realSignerFactory,
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
    createWalletApi: () =>
      new CardanoDappConnectorApi({
        ...captured.connectorParams!,
        userConfirmationRequest: async () => ({
          outcome: 'confirmed' as const,
        }),
      }),
    signingResults,
  };
};

const OWN_UTXO: Cardano.Utxo = [
  {
    address: FIXTURE_ADDRESS,
    txId: Cardano.TransactionId(`${'1'.repeat(63)}1`),
    index: 0,
  },
  {
    address: FIXTURE_ADDRESS,
    value: { coins: 10_000_000n },
  } as Cardano.TxOut,
];

const FOREIGN_INPUT: Cardano.TxIn = {
  txId: Cardano.TransactionId(`${'2'.repeat(63)}2`),
  index: 0,
};

const txCborOf = (body: Partial<Cardano.TxBody>): string =>
  Serialization.Transaction.fromCore({
    id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
    body: { fee: 200_000n, ...body } as Cardano.TxBody,
    witness: { signatures: new Map() },
  }).toCbor();

const coreBodyOf = (txCbor: string): Cardano.TxBody =>
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)).toCore()
    .body;

/**
 * What a witness set actually proves: for each vkey witness, whose key it is
 * (the hash the chain matches against a credential) and whether the signature
 * verifies over the body hash of the exact bytes the dApp submitted.
 */
const witnessFacts = (txCbor: string, witnessSetCbor: string) => {
  const vkeys = Serialization.TransactionWitnessSet.fromCbor(
    HexBlob(witnessSetCbor),
  ).vkeys();
  const bodyHash = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(txCbor),
  )
    .body()
    .hash();
  return (vkeys?.values() ?? [])
    .map(witness => witness.toCore())
    .map(([vkey, signature]) => {
      const publicKey = Crypto.Ed25519PublicKey.fromHex(vkey);
      return {
        keyHash: publicKey.hash().hex() as string,
        verifiesAgainstBodyHash: publicKey.verify(
          Crypto.Ed25519Signature.fromHex(signature),
          HexBlob(bodyHash as unknown as string),
        ),
      };
    });
};

// A multi-sig co-sign: the wallet's own UTxO alongside a stranger's, both
// parties named as required signers, everything on the wallet's own network.
const coSignTxCbor = txCborOf({
  inputs: [OWN_UTXO[0], FOREIGN_INPUT],
  outputs: [{ address: attackerTestnetAddress, value: { coins: 9_000_000n } }],
  networkId: Cardano.NetworkId.Testnet,
  requiredExtraSignatures: [ownPaymentKeyHash, foreignKeyHash],
});

// The sharper shape: the wallet contributes NO money at all. Every input is a
// stranger's; the wallet appears only as a required signer, so its witness is
// pure authorisation over someone else's transaction.
const noOwnMoneyTxCbor = txCborOf({
  inputs: [FOREIGN_INPUT],
  outputs: [
    { address: attackerTestnetAddress, value: { coins: 250_000_000n } },
  ],
  networkId: Cardano.NetworkId.Testnet,
  requiredExtraSignatures: [ownPaymentKeyHash],
});

const FOREIGN_SIGNATURE_REFUSAL =
  'The wallet does not have the secret key associated with some of the inputs or certificates.';

describe('partialSign bypasses the foreign-signature gate (LW-15469 follow-up)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // Premise: network binding is not what decides anything below.
  // ------------------------------------------------------------------
  it('both bodies are correctly bound to the wallet active network', () => {
    expect(FIXTURE.chainId.networkId).toBe(Cardano.NetworkId.Testnet);
    for (const txCbor of [coSignTxCbor, noOwnMoneyTxCbor])
      expect(
        isBoundToNetwork(coreBodyOf(txCbor), FIXTURE.chainId.networkId),
      ).toBe(true);
  });

  it('the no-own-money body spends nothing the wallet owns', () => {
    const inputs = coreBodyOf(noOwnMoneyTxCbor).inputs;
    expect(inputs).toHaveLength(1);
    expect(inputs[0].txId).toBe(FOREIGN_INPUT.txId);
    expect(
      coreBodyOf(noOwnMoneyTxCbor).outputs.map(({ address }) => address),
    ).not.toContain(FIXTURE_ADDRESS);
    expect(coreBodyOf(noOwnMoneyTxCbor).requiredExtraSignatures).toEqual([
      ownPaymentKeyHash,
    ]);
  });

  // ------------------------------------------------------------------
  // Pair 1 — a foreign co-signer alongside the wallet's own input.
  // ------------------------------------------------------------------
  it('CONTROL: refuses the co-sign body when partialSign is false', async () => {
    const { signTransaction, signingResults } = captureSignTransaction([
      OWN_UTXO,
    ]);

    await expect(
      signTransaction(coSignTxCbor, false, ORIGIN),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: FOREIGN_SIGNATURE_REFUSAL,
    });
    expect(signingResults).toEqual([
      {
        type: 'error',
        error: {
          stage: 'signing preparation',
          name: 'TxSignError',
          code: 1,
          message: FOREIGN_SIGNATURE_REFUSAL,
        },
      },
    ]);
  });

  it('contributes a real witness for the co-sign body when partialSign is true', async () => {
    const { signTransaction, signingResults } = captureSignTransaction([
      OWN_UTXO,
    ]);

    const facts = witnessFacts(
      coSignTxCbor,
      await signTransaction(coSignTxCbor, true, ORIGIN),
    );

    expect(facts).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
    // Only its own key: the stranger's required signature is left for the
    // stranger, which is what "partial" means.
    expect(facts.map(({ keyHash }) => keyHash)).not.toContain(foreignKeyHash);
    expect(signingResults).toEqual([{ type: 'success' }]);
  });

  // ------------------------------------------------------------------
  // Pair 2 — the wallet co-signs a transaction that moves none of its money.
  // ------------------------------------------------------------------
  it('CONTROL: refuses the no-own-money body when partialSign is false', async () => {
    const { signTransaction } = captureSignTransaction([OWN_UTXO]);

    await expect(
      signTransaction(noOwnMoneyTxCbor, false, ORIGIN),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: FOREIGN_SIGNATURE_REFUSAL,
    });
  });

  it('signs the no-own-money body with its OWN payment key when partialSign is true', async () => {
    const { signTransaction } = captureSignTransaction([OWN_UTXO]);

    const facts = witnessFacts(
      noOwnMoneyTxCbor,
      await signTransaction(noOwnMoneyTxCbor, true, ORIGIN),
    );

    // The credential that guards the account's own funds, used here purely as
    // authorisation over a transaction that touches none of them.
    expect(facts).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
  });

  // ------------------------------------------------------------------
  // Reachability: the whole CIP-30 call, not just the post-consent wrapper.
  // ------------------------------------------------------------------
  const sender: SenderContext = {
    sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
  };

  it('is reachable through the CIP-30 signTx entry point, pre-consent check included', async () => {
    const { createWalletApi } = captureSignTransaction([OWN_UTXO]);

    const facts = witnessFacts(
      noOwnMoneyTxCbor,
      await createWalletApi().signTx(noOwnMoneyTxCbor, true, sender),
    );

    expect(facts).toEqual([
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ]);
  });

  it('CONTROL: the same CIP-30 call with partialSign false is refused pre-consent', async () => {
    const { createWalletApi } = captureSignTransaction([OWN_UTXO]);

    await expect(
      createWalletApi().signTx(noOwnMoneyTxCbor, false, sender),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: FOREIGN_SIGNATURE_REFUSAL,
    });
  });

  // ------------------------------------------------------------------
  // What the gate is NOT: a funds guard. A plain own-money drain is fully
  // signable, so it passes with the flag off as readily as with it on —
  // whatever the gate protects, it is not the user's balance.
  // ------------------------------------------------------------------
  it('signs an own-money drain identically with the flag off and on', async () => {
    const ownDrainTxCbor = txCborOf({
      inputs: [OWN_UTXO[0]],
      outputs: [
        { address: attackerTestnetAddress, value: { coins: 9_000_000n } },
      ],
      networkId: Cardano.NetworkId.Testnet,
    });

    const factsFor = async (partialSign: boolean) =>
      witnessFacts(
        ownDrainTxCbor,
        await captureSignTransaction([OWN_UTXO]).signTransaction(
          ownDrainTxCbor,
          partialSign,
          ORIGIN,
        ),
      );

    const expected = [
      { keyHash: ownPaymentKeyHash, verifiesAgainstBodyHash: true },
    ];
    expect(await factsFor(false)).toEqual(expected);
    expect(await factsFor(true)).toEqual(expected);
  });

  // ------------------------------------------------------------------
  // The bound on the damage: partialSign widens WHICH bodies get a witness,
  // never WHICH keys sign. A credential outside the wallet stays unsigned even
  // when the body demands it.
  // ------------------------------------------------------------------
  it('never mints a witness for a credential the wallet does not own', async () => {
    const { signTransaction } = captureSignTransaction([OWN_UTXO]);
    const foreignOnlyTxCbor = txCborOf({
      inputs: [FOREIGN_INPUT],
      outputs: [
        { address: attackerTestnetAddress, value: { coins: 1_000_000n } },
      ],
      networkId: Cardano.NetworkId.Testnet,
      requiredExtraSignatures: [foreignKeyHash],
    });

    // Nothing of the wallet's is required, so the partial-sign floor — "at
    // least one signature, or refuse" — is what stops this one.
    await expect(
      signTransaction(foreignOnlyTxCbor, true, ORIGIN),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: 'The wallet does not have the secret key associated with any of the inputs and certificates.',
    });
  });
});
