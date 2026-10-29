import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromEncryptedRoot,
} from '@lace-contract/cardano-context';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { from, of, Subject, switchMap } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { APIErrorCode, TxSignErrorCode } from '../src/common/api-error';
import { handleSignTxConfirmation } from '../src/mobile/store/side-effects';

import type { WebViewResponse } from '../src/common/store/slice';
import type { Ed25519KeyHashHex, Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { WithCardanoKeyAgent$ } from '@lace-contract/cardano-context';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

// Native/RN-only modules the mobile side-effects module imports at load time.
// @cardano-sdk/crypto and @cardano-sdk/core are deliberately left real, so every
// witness below is a real Ed25519 signature over a real CBOR round-trip -- the
// only kind of evidence that settles whether a signature is spendable.
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
const ORIGIN = 'https://malicious-dapp.com';
const REQUEST_ID = 'req-1';

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

/** The production signer, built from the context the handler assembles. */
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

// Drives the real handleSignTxConfirmation side effect end-to-end and returns
// the WebViewResponse it hands back to the dApp WebView.
const runConfirmation = async (
  partialSign: boolean,
  txHex: string = mainnetDrainTxCbor,
  /** The OWNERSHIP view the network rule reads — settled own UTxOs plus own
   * pending outputs, which is NOT the available view beside it.
   * `'unfetched'` withholds the account's KEY, not merely its UTxOs. */
  ownershipUtxos: Cardano.Utxo[] | 'unfetched' = [],
): Promise<WebViewResponse> => {
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
        txHex,
        partialSign,
      }),
      selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
    },
    wallets: {
      selectActiveNetworkAccounts$: of([account]),
      selectAll$: of([wallet]),
    },
    addresses: { selectAllAddresses$: of(allAddresses) },
    cardanoContext: {
      selectChainId$: of(FIXTURE.chainId),
      selectAvailableAccountUtxos$: of(
        ownershipUtxos === 'unfetched' ? {} : { [ACCOUNT_ID]: ownershipUtxos },
      ),
      selectCollateralOwnershipUtxos$: of(
        ownershipUtxos === 'unfetched' ? {} : { [ACCOUNT_ID]: ownershipUtxos },
      ),
    },
  };
  const deps = {
    actions,
    accessAuthSecret: vi.fn(),
    authenticate: vi.fn().mockReturnValue(of(true)),
    signerFactory: realSignerFactory,
    // The victim's mainnet input is unknown to every testnet data source.
    cardanoProvider: { resolveInput: vi.fn().mockReturnValue(of(undefined)) },
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

// Bytes that do not parse at all: the gate below would otherwise replace the
// refusal with its own throw.
const undecodableTxCbor = 'deadbeef';

// A signature commits to a transaction body hash and nothing else -- it names
// no chain, and an account's payment credential is identical on every network.
// Without a rule binding the body to the active network, a testnet-connected
// dApp collects a witness that spends the account's mainnet coin. These hold
// the refusal in place.
describe('dApp-connector mobile signTx — cross-network signing refusal (LW-15469)', () => {
  it('is a genuinely cross-network request: wallet on preview, transaction on mainnet', () => {
    expect(FIXTURE.chainId.networkId).toBe(Cardano.NetworkId.Testnet);
    expect(
      Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(mainnetDrainTxCbor),
      ).toCore().body.networkId,
    ).toBe(Cardano.NetworkId.Mainnet);
    expect(ownMainnetAddress.startsWith('addr1')).toBe(true);
  });

  it('refuses a mainnet transaction under partial sign while the wallet is on preview', async () => {
    const response = await runConfirmation(true);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
  });

  // The partial-sign flag is the dApp's to set, so the refusal cannot depend
  // on it.
  it('refuses the identical transaction with the partial-sign flag off too', async () => {
    const response = await runConfirmation(false);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
  });

  // One kind of bad input, one answer: the code must not depend on a flag the
  // dApp sets itself.
  it.each([true, false])(
    'answers undecodable bytes the same way with partialSign %s',
    async partialSign => {
      const response = await runConfirmation(partialSign, undecodableTxCbor);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(TxSignErrorCode.ProofGeneration);
      expect(response.error?.info).toBe(
        'The transaction could not be decoded.',
      );
    },
  );
});

// The same rule from the other side, on the one stack with no e2e lane: the
// mobile handler is where the ownership evidence has to arrive, and an empty
// third argument here would silently refuse every legitimate registration.
describe('dApp-connector mobile signTx — a body bound by what it spends', () => {
  const OWN_OUTPOINT = {
    index: 0,
    txId: Cardano.TransactionId('11'.repeat(32)),
  };
  const ownUtxo = [
    OWN_OUTPOINT,
    { address: FIXTURE_ADDRESS, value: { coins: 10_000_000n } },
  ] as Cardano.Utxo;

  /** The body CSL emits when a sub-min-ada change is folded into the fee. */
  const zeroOutputRegistrationCbor = Serialization.Transaction.fromCore({
    id: Cardano.TransactionId(`${'0'.repeat(63)}2`),
    body: {
      certificates: [
        {
          __typename: Cardano.CertificateType.StakeRegistration,
          stakeCredential: Cardano.Address.fromBech32(FIXTURE_ADDRESS)
            .asBase()!
            .getStakeCredential(),
        },
      ],
      fee: 2_170_000n,
      inputs: [OWN_OUTPOINT],
      outputs: [],
    },
    witness: { signatures: new Map() },
  }).toCbor();

  it('signs when the input is an own UTxO', async () => {
    const response = await runConfirmation(true, zeroOutputRegistrationCbor, [
      ownUtxo,
    ]);

    expect(response.error).toBeUndefined();
    expect(response.success).toBe(true);
  });

  it('answers the retryable -2 while the account\u2019s own UTxOs are unfetched', async () => {
    const response = await runConfirmation(
      true,
      zeroOutputRegistrationCbor,
      'unfetched',
    );

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(APIErrorCode.InternalError);
    expect(response.error?.info).toBe(
      'Wallet UTxOs not ready; retry once the wallet has synced',
    );
  });

  it('refuses the identical bytes when the account owns no such UTxO', async () => {
    const response = await runConfirmation(true, zeroOutputRegistrationCbor);

    expect(response.success).toBe(false);
    expect(response.error?.info).toBe(
      'The transaction does not state which network it is for, and this account is on preprod.',
    );
  });
});
