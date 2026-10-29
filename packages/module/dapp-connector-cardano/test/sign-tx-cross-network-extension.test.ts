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
import { APIErrorCode, TxSignErrorCode } from '../src/common/api-error';
import { CardanoDappConnectorApi } from '../src/common/store/dependencies/cardano-dapp-connector-api';

import type { SigningResult } from '../src/browser/store/util';
import type { SenderContext } from '../src/browser/types';
import type { CardanoDappConnectorApiDependencies } from '../src/common/store/dependencies/cardano-dapp-connector-api';
import type { Ed25519KeyHashHex, Bip32PublicKeyHex } from '@cardano-sdk/crypto';
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

// signTx$/signData$/detectViewClosure only matter for the popup flow, which this
// test bypasses by driving the CIP-30 API and the captured signTransaction
// wrapper directly. @cardano-sdk/crypto and @cardano-sdk/core are NOT mocked, so
// every witness below is a real Ed25519 signature over a real CBOR round-trip --
// the only kind of evidence that settles whether a signature is spendable.
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
const ORIGIN = 'https://malicious-dapp.com';

const fixtureBaseAddress =
  Cardano.Address.fromBech32(FIXTURE_ADDRESS).asBase()!;
const ownPaymentKeyHash = fixtureBaseAddress.getPaymentCredential()
  .hash as unknown as Ed25519KeyHashHex;

// The account's address on MAINNET, built from the very credentials of its
// preview address: an account's payment credential is the hash of a key derived
// without any network input, so the two addresses differ only in the network tag
// packed into the bech32. This is what makes a preview-issued signature spend
// mainnet coin -- a witness commits to the key, never to the network.
const ownMainnetAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  fixtureBaseAddress.getPaymentCredential(),
  fixtureBaseAddress.getStakeCredential(),
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

const attackerMainnetAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  {
    hash: Hash28ByteBase16('a'.repeat(56)),
    type: Cardano.CredentialType.KeyHash,
  },
  {
    hash: Hash28ByteBase16('b'.repeat(56)),
    type: Cardano.CredentialType.KeyHash,
  },
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

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

const authSecret = ByteArray.fromUTF8(PASSWORD) as unknown as Parameters<
  typeof createCardanoKeyAgentFromEncryptedRoot
>[0]['authSecret'];

const withKeyAgent$: WithCardanoKeyAgent$ = use =>
  from(createCardanoKeyAgentFromEncryptedRoot({ ...FIXTURE, authSecret })).pipe(
    switchMap(use),
  );

// The production signer, wrapped in the collateral guard exactly as every
// production factory wraps it, so nothing about the signing path is simulated.
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

// Subscribes to the real side effect, captures the signTransaction wrapper the
// SW hands the connector, and builds the CIP-30 API from the same wiring -- so a
// test can drive either the post-consent wrapper alone or the whole API call
// including the pre-consent check that runs before the review sheet.
const captureSignTransaction = (
  localUtxos: Cardano.Utxo[] = [],
  /** The OWNERSHIP view, which differs from the available one by exactly the
   * collateral-reserved UTxOs — the distinction the ownership arm turns on.
   * `'unfetched'` withholds the account's KEY, not merely its UTxOs. */
  ownershipUtxos: Cardano.Utxo[] | 'unfetched' = localUtxos,
): {
  signTransaction: SignTransaction;
  createWalletApi: (
    signTransaction?: SignTransaction,
  ) => CardanoDappConnectorApi;
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
      selectCollateralOwnershipUtxos$: of(
        ownershipUtxos === 'unfetched' ? {} : { [ACCOUNT_ID]: ownershipUtxos },
      ),
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
      // The victim's mainnet input is unknown to every testnet data source.
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
    createWalletApi: (
      /** Replaces the post-consent wrapper, which re-runs the network rule.
       * Pass a stub to leave the PRE-consent check as the only gate. */
      signTransaction?: SignTransaction,
    ) =>
      new CardanoDappConnectorApi({
        ...captured.connectorParams!,
        ...(signTransaction && { signTransaction }),
        userConfirmationRequest: async () => ({
          outcome: 'confirmed' as const,
        }),
      }),
    signingResults,
  };
};

/**
 * The attack transaction: spends a mainnet UTxO of the victim that no testnet
 * data source can resolve, pays an attacker mainnet address, declares mainnet in
 * the body, and names the victim's payment key in `requiredExtraSignatures` --
 * the one field that makes the SDK select a key by credential hash alone,
 * without needing the input resolved.
 */
const mainnetDrainTxCbor = Serialization.Transaction.fromCore({
  id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
  body: {
    inputs: [{ txId: Cardano.TransactionId(`${'9'.repeat(63)}1`), index: 0 }],
    outputs: [
      { address: attackerMainnetAddress, value: { coins: 250_000_000n } },
    ],
    fee: 200_000n,
    networkId: Cardano.NetworkId.Mainnet,
    requiredExtraSignatures: [ownPaymentKeyHash],
  },
  witness: { signatures: new Map() },
}).toCbor();

/**
 * The legitimate counterpart: the body CSL emits for a stake registration whose
 * sub-min-ada change was folded into the fee. No outputs, no `networkId`, no
 * withdrawal -- nothing the evidence walk can read. It spends the account's own
 * preview UTxO, which is what binds it.
 */
const OWN_OUTPOINT = {
  index: 0,
  txId: Cardano.TransactionId('11'.repeat(32)),
};
const ownUtxo: Cardano.Utxo = [
  { ...OWN_OUTPOINT, address: FIXTURE_ADDRESS },
  { address: FIXTURE_ADDRESS, value: { coins: 10_000_000n } },
];
const zeroOutputRegistrationCbor = Serialization.Transaction.fromCore({
  id: Cardano.TransactionId(`${'0'.repeat(63)}2`),
  body: {
    certificates: [
      {
        __typename: Cardano.CertificateType.StakeRegistration,
        stakeCredential: fixtureBaseAddress.getStakeCredential(),
      },
    ],
    fee: 2_170_000n,
    inputs: [OWN_OUTPOINT],
    outputs: [],
  },
  witness: { signatures: new Map() },
}).toCbor();

// A signature commits to a transaction body hash and nothing else -- it names
// no chain, and an account's payment credential is identical on every network.
// Without a rule binding the body to the active network, a testnet-connected
// dApp collects a witness that spends the account's mainnet coin. These hold
// the refusal in place.
describe('dApp-connector signTx — cross-network signing refusal (LW-15469)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is a genuinely cross-network request: wallet on preview, transaction on mainnet', () => {
    expect(FIXTURE.chainId.networkId).toBe(Cardano.NetworkId.Testnet);
    expect(
      Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(mainnetDrainTxCbor),
      ).toCore().body.networkId,
    ).toBe(Cardano.NetworkId.Mainnet);
    expect(ownMainnetAddress.startsWith('addr1')).toBe(true);
    expect(FIXTURE_ADDRESS.startsWith('addr_test1')).toBe(true);
  });

  it('refuses a mainnet transaction under partial sign while the wallet is on preview', async () => {
    const { signTransaction, signingResults } = captureSignTransaction();

    await expect(
      signTransaction(mainnetDrainTxCbor, true, ORIGIN),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
    expect(signingResults).toEqual([
      {
        type: 'error',
        error: {
          stage: 'signing preparation',
          name: 'TxSignError',
          code: 1,
          message:
            'The transaction targets mainnet, but this account is on preprod.',
        },
      },
    ]);
  });

  it('refuses it in the CIP-30 pre-consent check, before any review sheet', async () => {
    const { createWalletApi } = captureSignTransaction();
    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };

    await expect(
      createWalletApi().signTx(mainnetDrainTxCbor, true, sender),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  // The partial-sign flag is the dApp's to set, so the refusal cannot depend
  // on it.
  it('refuses the identical transaction with the partial-sign flag off too', async () => {
    const { signTransaction } = captureSignTransaction();

    await expect(
      signTransaction(mainnetDrainTxCbor, false, ORIGIN),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
    });
  });

  // The pre-consent path decodes before the rule can look at anything, so it
  // needs a wrapper to answer unparseable bytes the way
  // `cborNetworkBindingRefusal` does: one kind of bad input, one answer,
  // whichever path reached it.
  it('answers undecodable bytes with the shared refusal, not a serialisation error', async () => {
    const { createWalletApi } = captureSignTransaction();
    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };

    await expect(
      createWalletApi().signTx('deadbeef', true, sender),
    ).rejects.toMatchObject({
      code: TxSignErrorCode.ProofGeneration,
      info: 'The transaction could not be decoded.',
      name: 'TxSignError',
    });
  });
});

// The same rule from the other side. "At least one element must speak" refused
// a body CSL itself emits, and the two checks above are the two places that
// refusal reached production -- so the acceptance has to be shown at both, not
// just in the rule's own unit tests.
describe('dApp-connector signTx — a body bound by what it spends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is genuinely unreadable to the evidence walk: no outputs, no networkId', () => {
    const body = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(zeroOutputRegistrationCbor),
    ).toCore().body;

    expect(body.outputs).toEqual([]);
    expect(body.networkId).toBeUndefined();
    expect(body.withdrawals).toBeUndefined();
  });

  it('signs in the CIP-30 pre-consent check when the input is an own UTxO', async () => {
    const { createWalletApi } = captureSignTransaction([ownUtxo]);
    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };

    await expect(
      createWalletApi().signTx(zeroOutputRegistrationCbor, true, sender),
    ).resolves.toEqual(expect.any(String));
  });

  it('signs at the post-consent wrapper too', async () => {
    const { signTransaction } = captureSignTransaction([ownUtxo]);

    await expect(
      signTransaction(zeroOutputRegistrationCbor, true, ORIGIN),
    ).resolves.toEqual(expect.any(String));
  });

  it('refuses bytes that state a key twice', async () => {
    // Driven with a STUB signer, so the pre-consent check is the only gate:
    // the post-consent wrapper re-runs the rule through the wire-format entry
    // point, which is gated already and would mask this site's answer.
    const writer = new Serialization.CborWriter();
    writer.writeStartArray(4);
    writer.writeStartMap(3);
    for (const txId of [`${'9'.repeat(63)}1`, OWN_OUTPOINT.txId]) {
      writer.writeInt(0n);
      writer.writeStartArray(1);
      writer.writeStartArray(2);
      writer.writeByteString(Buffer.from(txId, 'hex'));
      writer.writeInt(0n);
    }
    writer.writeInt(2n);
    writer.writeInt(200_000n);
    writer.writeStartMap(0);
    writer.writeBoolean(true);
    writer.writeNull();
    const ambiguous = writer.encodeAsHex();

    const { createWalletApi } = captureSignTransaction([ownUtxo]);
    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };

    await expect(
      createWalletApi(async () => 'deadbeef').signTx(ambiguous, true, sender),
    ).rejects.toMatchObject({
      code: TxSignErrorCode.ProofGeneration,
      info: 'Part of the transaction could not be read, so the wallet cannot confirm it belongs to preprod.',
    });
  });

  it('reads the OWNERSHIP view, not the available one', async () => {
    // A collateral-reserved UTxO is ours but not spendable, so it is in the
    // ownership view and absent from the available one. Reading the wrong
    // view here would falsely refuse a legitimate registration.
    const { createWalletApi } = captureSignTransaction([], [ownUtxo]);
    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };

    const outcome = await createWalletApi()
      .signTx(zeroOutputRegistrationCbor, true, sender)
      .catch((error: { info?: string }) => error);

    expect(JSON.stringify(outcome)).not.toContain(
      'does not state which network',
    );
  });

  it('answers the retryable -2 while the account\u2019s own UTxOs are unfetched', async () => {
    const { createWalletApi, signTransaction } = captureSignTransaction(
      [],
      'unfetched',
    );
    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };

    for (const call of [
      createWalletApi().signTx(zeroOutputRegistrationCbor, true, sender),
      signTransaction(zeroOutputRegistrationCbor, true, ORIGIN),
    ])
      await expect(call).rejects.toMatchObject({
        code: APIErrorCode.InternalError,
        info: 'Wallet UTxOs not ready; retry once the wallet has synced',
        name: 'APIError',
      });
  });

  // What accepts it is the ownership, not the empty outputs: with the same
  // bytes and no own UTxO to vouch for the input, both checks refuse.
  it('refuses the identical bytes when the account owns no such UTxO', async () => {
    const { createWalletApi, signTransaction } = captureSignTransaction();
    const sender: SenderContext = {
      sender: { url: ORIGIN, tab: { id: 1 } } as Runtime.MessageSender,
    };

    await expect(
      createWalletApi().signTx(zeroOutputRegistrationCbor, true, sender),
    ).rejects.toMatchObject({
      code: TxSignErrorCode.ProofGeneration,
      info: 'The transaction does not state which network it is for, and this account is on preprod.',
      name: 'TxSignError',
    });
    await expect(
      signTransaction(zeroOutputRegistrationCbor, true, ORIGIN),
    ).rejects.toMatchObject({ name: 'TxSignError' });
  });
});
