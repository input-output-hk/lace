import { Cardano, Serialization } from '@cardano-sdk/core';
import { AddressType, KeyRole } from '@cardano-sdk/key-management';
import { BlockchainNetworkId } from '@lace-contract/network';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { APIErrorCode } from '../src/common/api-error';
import { CardanoDappConnectorApi } from '../src/common/store/dependencies/cardano-dapp-connector-api';

import type { Paginate, SenderContext } from '../src/browser/types';
import type { CardanoConfirmationCallback } from '../src/common/store/dependencies/create-confirmation-callback';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { Address, AnyAddress } from '@lace-contract/addresses';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type {
  AccountRewardAccountDetailsMap,
  AccountUtxoMap,
  CardanoAccountAddressHistoryMap,
  CardanoAddressData,
  CardanoBip32AccountProps,
  CardanoMultiSigAccountProps,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import type { CardanoSignerFactory } from '@lace-contract/cardano-context';
import type {
  AnyAccount,
  InMemoryWallet,
  InMemoryWalletAccount,
  MultiSigWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Runtime } from 'webextension-polyfill';

// Mock the SDK's key-management module
vi.mock('@cardano-sdk/key-management', async () => {
  const actual = await vi.importActual('@cardano-sdk/key-management');
  return {
    ...actual,
    cip8: {
      cip30signData: vi.fn().mockResolvedValue({
        signature: 'mock-signature-cbor',
        key: 'mock-key-cbor',
      }),
    },
    InMemoryKeyAgent: vi.fn().mockImplementation(() => ({})),
    // Mock Bip32Account for #validateCanSign DRep key computation
    Bip32Account: vi.fn().mockImplementation(() => ({
      derivePublicKey: vi.fn().mockResolvedValue('0'.repeat(64)),
    })),
  };
});

vi.mock('@cardano-sdk/crypto', async () => {
  const actual = await vi.importActual('@cardano-sdk/crypto');
  return {
    ...actual,
    SodiumBip32Ed25519: {
      create: vi.fn().mockResolvedValue({}),
    },
    // Mock Ed25519PublicKey for DRep key hash computation
    Ed25519PublicKey: {
      fromHex: vi.fn().mockReturnValue({
        hash: vi.fn().mockReturnValue({
          hex: vi.fn().mockReturnValue('0'.repeat(56)),
        }),
      }),
    },
  };
});

// Mock the input-resolver utilities used by #validateCanSign
// These are tested separately in input-resolver.test.ts
vi.mock('../src/common/store/utils/input-resolver', async () => {
  const actual = await vi.importActual(
    '../src/common/store/utils/input-resolver',
  );
  return {
    ...actual,
    requiresForeignSignaturesFromCbor: vi.fn().mockReturnValue(false),
  };
});

const PAYMENT_ADDRESS_1 =
  'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d';
const PAYMENT_ADDRESS_2 =
  'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl';
const PAYMENT_ADDRESS_3 =
  'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu';

const REWARD_ACCOUNT =
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz';

const assetId = Cardano.AssetId(
  'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e',
);

const createMockUtxo = ({
  txIdHex,
  index,
  address,
  coins,
  assets,
}: {
  txIdHex: string;
  index: number;
  address: string;
  coins: bigint;
  assets?: unknown;
}): Cardano.Utxo => [
  {
    address: Cardano.PaymentAddress(address),
    txId: Cardano.TransactionId(txIdHex),
    index,
  },
  {
    address: Cardano.PaymentAddress(address),
    value: {
      coins,
      assets,
    } as unknown as Cardano.Value,
  },
];

const createMockAddress = (
  address: string,
  accountId: ReturnType<typeof AccountId>,
  rewardAccount?: string,
): AnyAddress =>
  ({
    address,
    accountId,
    blockchainName: 'Cardano',
    data: rewardAccount ? { rewardAccount } : undefined,
  } as unknown as AnyAddress);

const TEST_DAPP_ORIGIN = 'https://test-dapp.com';

/**
 * Creates a mock sender context for testing.
 * The API extracts origin from sender.url using senderOrigin().
 */
const createMockSenderContext = (
  origin: string = TEST_DAPP_ORIGIN,
): SenderContext => ({
  sender: {
    url: origin,
    tab: { id: 1 },
  } as Runtime.MessageSender,
});

/**
 * Creates a getAccountIdForOrigin function for testing.
 * Maps the test origin to the provided accountId.
 */
const createMockGetAccountIdForOrigin =
  (
    accountId: ReturnType<typeof AccountId>,
    origin: string = TEST_DAPP_ORIGIN,
  ) =>
  (requestedOrigin: string) =>
    requestedOrigin === origin ? accountId : undefined;

const defaultNewDeps = {
  accountUnspendableUtxos$: of({} as AccountUtxoMap),
  rewardAccountDetails$: of({} as AccountRewardAccountDetailsMap),
  accountTransactionHistory$: of({} as CardanoAccountAddressHistoryMap),
};

describe('CardanoDappConnectorApi', () => {
  it('getNetworkId returns network id from chainId$', async () => {
    const accountId = AccountId('acc-1');
    const api = new CardanoDappConnectorApi({
      ...defaultNewDeps,
      accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
      addresses$: of([]),
      chainId$: of({
        networkId: 0,
        networkMagic: Cardano.NetworkMagics.Preprod,
      } as Cardano.ChainId),
      allAccounts$: of([]),
      allWallets$: of([]),
      getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
      submitTransaction: vi.fn(),
    });

    await expect(api.getNetworkId()).resolves.toBe(0);
  });

  it('getUtxos returns null when active account has no utxos', async () => {
    const accountId = AccountId('acc-1');
    const api = new CardanoDappConnectorApi({
      ...defaultNewDeps,
      accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
      addresses$: of([]),
      chainId$: of(undefined),
      allAccounts$: of([]),
      allWallets$: of([]),
      getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
      submitTransaction: vi.fn(),
    });

    const senderContext = createMockSenderContext();
    await expect(
      api.getUtxos(undefined, undefined, senderContext),
    ).resolves.toBeNull();
  });

  it('getUtxos filters by (coins + assets) and returns a minimal prefix that satisfies required amount', async () => {
    const accountId = AccountId('acc-1');

    const utxo1 = createMockUtxo({
      txIdHex: '0'.repeat(64),
      index: 0,
      address: PAYMENT_ADDRESS_1,
      coins: 1_000_000n,
      assets: new Map([[assetId, 3n]]),
    });

    // Use a plain object here to exercise the "record" assets handling path
    const utxo2 = createMockUtxo({
      txIdHex: '1'.repeat(64),
      index: 1,
      address: PAYMENT_ADDRESS_2,
      coins: 2_000_000n,
      assets: new Map([[assetId, 2n]]),
    });

    const utxo3 = createMockUtxo({
      txIdHex: '2'.repeat(64),
      index: 2,
      address: PAYMENT_ADDRESS_3,
      coins: 10_000_000n,
      assets: new Map(),
    });

    const api = new CardanoDappConnectorApi({
      ...defaultNewDeps,
      accountUtxos$: of({
        [accountId]: [utxo1, utxo2, utxo3],
      } as unknown as AccountUtxoMap),
      addresses$: of([]),
      chainId$: of(undefined),
      allAccounts$: of([]),
      allWallets$: of([]),
      getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
      submitTransaction: vi.fn(),
    });

    const requiredValueCbor = Serialization.Value.fromCore({
      coins: 3_000_000n,
      assets: new Map([[assetId, 5n]]),
    } as Cardano.Value).toCbor();

    const senderContext = createMockSenderContext();
    const result = await api.getUtxos(
      requiredValueCbor,
      undefined,
      senderContext,
    );
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);

    const decoded = result!.map(cbor =>
      Serialization.TransactionUnspentOutput.fromCbor(
        Serialization.TxCBOR(cbor),
      ).toCore(),
    );

    expect(decoded[0][0].txId).toBe(utxo1[0].txId);
    expect(decoded[1][0].txId).toBe(utxo2[0].txId);
  });

  it('getUtxos paginates results (after optional filtering)', async () => {
    const accountId = AccountId('acc-1');
    const utxos = [
      createMockUtxo({
        txIdHex: '0'.repeat(64),
        index: 0,
        address: PAYMENT_ADDRESS_1,
        coins: 1_000_000n,
      }),
      createMockUtxo({
        txIdHex: '1'.repeat(64),
        index: 1,
        address: PAYMENT_ADDRESS_2,
        coins: 2_000_000n,
      }),
      createMockUtxo({
        txIdHex: '2'.repeat(64),
        index: 2,
        address: PAYMENT_ADDRESS_3,
        coins: 3_000_000n,
      }),
    ];

    const api = new CardanoDappConnectorApi({
      ...defaultNewDeps,
      accountUtxos$: of({ [accountId]: utxos } as unknown as AccountUtxoMap),
      addresses$: of([]),
      chainId$: of(undefined),
      allAccounts$: of([]),
      allWallets$: of([]),
      getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
      submitTransaction: vi.fn(),
    });

    const senderContext = createMockSenderContext();
    const paginate: Paginate = { page: 0, limit: 1 };
    const result = await api.getUtxos(undefined, paginate, senderContext);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);

    const decoded = Serialization.TransactionUnspentOutput.fromCbor(
      Serialization.TxCBOR(result![0]),
    ).toCore();
    expect(decoded[0].txId).toBe(utxos[0][0].txId);
  });

  it('getBalance returns a CBOR-encoded Value with summed coins and assets', async () => {
    const accountId = AccountId('acc-1');

    const api = new CardanoDappConnectorApi({
      ...defaultNewDeps,
      accountUtxos$: of({
        [accountId]: [
          createMockUtxo({
            txIdHex: '0'.repeat(64),
            index: 0,
            address: PAYMENT_ADDRESS_1,
            coins: 1_000_000n,
            assets: new Map([[assetId, 3n]]),
          }),
          createMockUtxo({
            txIdHex: '1'.repeat(64),
            index: 1,
            address: PAYMENT_ADDRESS_2,
            coins: 2_000_000n,
            assets: new Map([[assetId, 2n]]),
          }),
        ],
      } as unknown as AccountUtxoMap),
      addresses$: of([]),
      chainId$: of(undefined),
      allAccounts$: of([]),
      allWallets$: of([]),
      getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
      submitTransaction: vi.fn(),
    });

    const senderContext = createMockSenderContext();
    const balanceCbor = await api.getBalance(senderContext);
    const value = Serialization.Value.fromCbor(
      Serialization.TxCBOR(balanceCbor),
    ).toCore();

    expect(value.coins).toBe(3_000_000n);
    expect(value.assets?.get(assetId)).toBe(5n);
  });

  it('address methods return expected results (used/unused/change/reward)', async () => {
    const accountId = AccountId('acc-1');

    const utxos = [
      createMockUtxo({
        txIdHex: '0'.repeat(64),
        index: 0,
        address: PAYMENT_ADDRESS_1,
        coins: 1_000_000n,
      }),
      createMockUtxo({
        txIdHex: '1'.repeat(64),
        index: 1,
        address: PAYMENT_ADDRESS_2,
        coins: 1_000_000n,
      }),
    ];

    const addresses = [
      createMockAddress(PAYMENT_ADDRESS_1, accountId, REWARD_ACCOUNT),
      createMockAddress(PAYMENT_ADDRESS_2, accountId, REWARD_ACCOUNT),
      createMockAddress(PAYMENT_ADDRESS_3, accountId),
    ];

    const api = new CardanoDappConnectorApi({
      ...defaultNewDeps,
      accountUtxos$: of({ [accountId]: utxos } as unknown as AccountUtxoMap),
      addresses$: of(addresses),
      chainId$: of(undefined),
      allAccounts$: of([]),
      allWallets$: of([]),
      getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
      submitTransaction: vi.fn(),
    });

    const senderContext = createMockSenderContext();

    const used = await api.getUsedAddresses(
      { page: 0, limit: 1 },
      senderContext,
    );
    expect(used).toHaveLength(1);
    expect(used[0]).toBe(
      Cardano.Address.fromBech32(PAYMENT_ADDRESS_1).toBytes(),
    );

    const unused = await api.getUnusedAddresses(senderContext);
    expect(unused).toHaveLength(0); // No Cardano account available

    const change = await api.getChangeAddress(senderContext);
    expect(change).toBe(
      Cardano.Address.fromBech32(PAYMENT_ADDRESS_1).toBytes(),
    );

    const rewards = await api.getRewardAddresses(senderContext);
    expect(rewards).toHaveLength(1);
    expect(rewards[0]).toBe(
      Cardano.Address.fromBech32(REWARD_ACCOUNT).toBytes(),
    );
  });

  describe('getUnusedAddresses', () => {
    const walletId = WalletId('wallet-1');
    const chainId: Cardano.ChainId = {
      networkId: Cardano.NetworkId.Testnet,
      networkMagic: Cardano.NetworkMagics.Preprod,
    };
    const rewardAccount = REWARD_ACCOUNT as CardanoRewardAccount;
    const blockchainNetworkId = BlockchainNetworkId('cardano-preprod');

    const mockCardanoAccount: InMemoryWalletAccount<CardanoBip32AccountProps> =
      {
        accountId: AccountId('acc-1'),
        walletId,
        accountType: 'InMemory',
        blockchainName: 'Cardano',
        blockchainNetworkId,
        blockchainSpecific: {
          accountIndex: 0,
          extendedAccountPublicKey: '0'.repeat(128) as Bip32PublicKeyHex,
          chainId,
        },
        metadata: { name: 'Test' },
        networkType: 'testnet',
      };

    const createExternalAddress = (
      address: string,
      accountId: AccountId,
      index: number,
    ): AnyAddress<CardanoAddressData> => ({
      address: address as Address,
      accountId,
      blockchainName: 'Cardano',
      data: {
        type: AddressType.External,
        index,
        networkId: chainId.networkId,
        networkMagic: chainId.networkMagic,
        accountIndex: 0,
        rewardAccount,
        stakeKeyDerivationPath: { index: 0, role: KeyRole.Stake },
      },
    });

    it('returns latest External address when it has no transaction history', async () => {
      const accountId = mockCardanoAccount.accountId;
      const addresses = [
        createExternalAddress(PAYMENT_ADDRESS_1, accountId, 0),
        createExternalAddress(PAYMENT_ADDRESS_2, accountId, 1),
      ];
      const history = {
        [accountId]: {
          [PAYMENT_ADDRESS_1]: {
            hasLoadedOldestEntry: false,
            transactionHistory: [{ txId: '0'.repeat(64) }],
          },
        },
      } as unknown as CardanoAccountAddressHistoryMap;

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountTransactionHistory$: of(history),
        accountUtxos$: of({} as AccountUtxoMap),
        addresses$: of(addresses),
        chainId$: of(undefined),
        allAccounts$: of([mockCardanoAccount]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const result = await api.getUnusedAddresses(createMockSenderContext());
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(
        Cardano.Address.fromBech32(PAYMENT_ADDRESS_2).toBytes(),
      );
    });

    it('derives and persists next External address when all existing are used', async () => {
      const accountId = mockCardanoAccount.accountId;
      const addresses = [
        createExternalAddress(PAYMENT_ADDRESS_1, accountId, 0),
      ];
      const history = {
        [accountId]: {
          [PAYMENT_ADDRESS_1]: {
            hasLoadedOldestEntry: false,
            transactionHistory: [{ txId: '0'.repeat(64) }],
          },
        },
      } as unknown as CardanoAccountAddressHistoryMap;
      const derived = createExternalAddress(PAYMENT_ADDRESS_3, accountId, 1);
      const deriveNextUnusedAddress = vi.fn().mockResolvedValue(derived);

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountTransactionHistory$: of(history),
        accountUtxos$: of({} as AccountUtxoMap),
        addresses$: of(addresses),
        chainId$: of(undefined),
        allAccounts$: of([mockCardanoAccount]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
        deriveNextUnusedAddress,
      });

      const result = await api.getUnusedAddresses(createMockSenderContext());
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(
        Cardano.Address.fromBech32(PAYMENT_ADDRESS_3).toBytes(),
      );
      expect(deriveNextUnusedAddress).toHaveBeenCalledWith(accountId);
    });

    it('returns empty when all existing addresses used and no derive callback wired', async () => {
      const accountId = mockCardanoAccount.accountId;
      const addresses = [
        createExternalAddress(PAYMENT_ADDRESS_1, accountId, 0),
      ];
      const history = {
        [accountId]: {
          [PAYMENT_ADDRESS_1]: {
            hasLoadedOldestEntry: false,
            transactionHistory: [{ txId: '0'.repeat(64) }],
          },
        },
      } as unknown as CardanoAccountAddressHistoryMap;

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountTransactionHistory$: of(history),
        accountUtxos$: of({} as AccountUtxoMap),
        addresses$: of(addresses),
        chainId$: of(undefined),
        allAccounts$: of([mockCardanoAccount]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const result = await api.getUnusedAddresses(createMockSenderContext());
      expect(result).toHaveLength(0);
    });

    it('returns empty array for MultiSig accounts', async () => {
      const accountId = AccountId('multi-1');
      const multiSigAccount: MultiSigWalletAccount<CardanoMultiSigAccountProps> =
        {
          accountId,
          walletId,
          accountType: 'MultiSig',
          blockchainName: 'Cardano',
          blockchainNetworkId,
          blockchainSpecific: {
            chainId,
            paymentKeyPath: { index: 0, role: KeyRole.External },
            stakingKeyPath: { index: 0, role: KeyRole.Stake },
            paymentScript: {} as Cardano.NativeScript,
            stakingScript: {} as Cardano.NativeScript,
          },
          metadata: { name: 'MS' },
          networkType: 'testnet',
          ownSigners: [],
        };
      const deriveNextUnusedAddress = vi.fn();

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({} as AccountUtxoMap),
        addresses$: of([
          createExternalAddress(PAYMENT_ADDRESS_1, accountId, 0),
        ]),
        chainId$: of(undefined),
        allAccounts$: of([multiSigAccount]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
        deriveNextUnusedAddress,
      });

      const result = await api.getUnusedAddresses(createMockSenderContext());
      expect(result).toHaveLength(0);
      expect(deriveNextUnusedAddress).not.toHaveBeenCalled();
    });
  });

  describe('signTx', () => {
    const mockSender: SenderContext = {
      sender: {
        url: 'https://test-dapp.com',
        tab: { id: 1 },
      } as Runtime.MessageSender,
    };

    it('throws InternalError when signing not configured', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
        // No userConfirmationRequest or signTransaction
      });

      await expect(api.signTx('abcd1234', false, mockSender)).rejects.toThrow(
        'Signing not configured',
      );
    });

    it('throws Refused error when user rejects', async () => {
      const accountId = AccountId('acc-1');
      const walletId = WalletId('wallet-1');
      const mockConfirmation = vi.fn().mockResolvedValue({
        isConfirmed: false,
      }) as unknown as CardanoConfirmationCallback;

      // Create a mock account with Cardano-specific properties
      const mockAccount: AnyAccount = {
        accountId,
        walletId,
        accountIndex: 0,
        accountType: 'Bip32',
        blockchainName: 'Cardano',
        blockchainNetworkId: 'cardano-preprod',
        blockchainSpecific: {
          accountIndex: 0,
          extendedAccountPublicKey: '0'.repeat(128),
        },
        metadata: { name: 'Test Account' },
        networkType: 'testnet',
      } as unknown as AnyAccount;

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of({
          networkId: Cardano.NetworkId.Testnet,
          networkMagic: Cardano.NetworkMagics.Preprod,
        } as Cardano.ChainId),
        allAccounts$: of([mockAccount]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        userConfirmationRequest: mockConfirmation,
        signTransaction: vi.fn(),
        submitTransaction: vi.fn(),
      });

      try {
        // Validation functions are mocked, so we can use simple tx data
        await api.signTx('abcd1234', false, mockSender);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as { code: number }).code).toBe(APIErrorCode.Refused);
      }
    });

    it('returns witness set when user confirms', async () => {
      const accountId = AccountId('acc-1');
      const walletId = WalletId('wallet-1');
      const expectedWitnessSet = 'witness-cbor-hex';

      // Create a mock account with Cardano-specific properties
      const mockAccount: AnyAccount = {
        accountId,
        walletId,
        accountIndex: 0,
        accountType: 'Bip32',
        blockchainName: 'Cardano',
        blockchainNetworkId: 'cardano-preprod',
        blockchainSpecific: {
          accountIndex: 0,
          extendedAccountPublicKey: '0'.repeat(128),
        },
        metadata: { name: 'Test Account' },
        networkType: 'testnet',
      } as unknown as AnyAccount;

      const mockConfirmation = vi.fn().mockResolvedValue({
        isConfirmed: true,
      }) as unknown as CardanoConfirmationCallback;

      const mockSignTransaction = vi.fn().mockResolvedValue(expectedWitnessSet);

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of({
          networkId: Cardano.NetworkId.Testnet,
          networkMagic: Cardano.NetworkMagics.Preprod,
        } as Cardano.ChainId),
        allAccounts$: of([mockAccount]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        userConfirmationRequest: mockConfirmation,
        signTransaction: mockSignTransaction,
        submitTransaction: vi.fn(),
      });

      // Validation functions are mocked, so we can use simple tx data
      const result = await api.signTx('abcd1234', true, mockSender);

      expect(result).toBe(expectedWitnessSet);
      expect(mockConfirmation).toHaveBeenCalledWith(
        mockSender.sender,
        'signTx',
        { txHex: 'abcd1234', partialSign: true },
      );
      expect(mockSignTransaction).toHaveBeenCalledWith(
        'abcd1234',
        true,
        'https://test-dapp.com',
      );
    });
  });

  describe('signData', () => {
    const mockSender: SenderContext = {
      sender: {
        url: 'https://test-dapp.com',
        tab: { id: 1 },
      } as Runtime.MessageSender,
    };

    it('throws InternalError when signing not configured', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
        // No userConfirmationRequest or signData
      });

      await expect(
        api.signData('addr_test1...', 'deadbeef', mockSender),
      ).rejects.toThrow('Signing not configured');
    });

    it('throws Refused error when user rejects', async () => {
      const accountId = AccountId('acc-1');
      const mockConfirmation = vi.fn().mockResolvedValue({
        isConfirmed: false,
      }) as unknown as CardanoConfirmationCallback;

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        userConfirmationRequest: mockConfirmation,
        submitTransaction: vi.fn(),
      });

      try {
        await api.signData('addr_test1...', 'deadbeef', mockSender);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as { code: number }).code).toBe(APIErrorCode.Refused);
      }
    });

    it('returns signature when user confirms', async () => {
      const accountId = AccountId('acc-1');
      const walletId = WalletId('wallet-1');

      // Create a mock account with required Cardano properties
      const mockAccount: AnyAccount = {
        accountId,
        walletId,
        accountIndex: 0,
        accountType: 'Bip32',
        name: 'Test Account',
        blockchainName: 'Cardano', // Required for isCardanoAccount check
        blockchainSpecific: {
          accountIndex: 0,
          chainId: {
            networkId: 0,
            networkMagic: Cardano.NetworkMagics.Preprod,
          },
          extendedAccountPublicKey: '0'.repeat(128), // Mock 64-byte public key hex
        },
      } as unknown as AnyAccount;

      // Create a mock InMemory wallet with encrypted root private key
      const mockWallet = {
        walletId,
        name: 'Test Wallet',
        type: WalletType.InMemory,
        metadata: {},
        blockchainSpecific: {
          Cardano: {
            encryptedRootPrivateKey: 'a'.repeat(192), // Mock encrypted key hex
          },
        },
      } as unknown as InMemoryWallet;

      // Create mock addresses with required CardanoAddressData
      const mockAddresses = [
        {
          address: PAYMENT_ADDRESS_1,
          accountId,
          blockchainName: 'Cardano',
          data: {
            type: 0,
            index: 0,
            networkId: 0,
            accountIndex: 0,
            rewardAccount: REWARD_ACCOUNT,
            stakeKeyDerivationPath: { role: 2, index: 0 },
          },
        } as unknown as AnyAddress,
      ];

      const mockConfirmation = vi.fn().mockResolvedValue({
        isConfirmed: true,
      }) as unknown as CardanoConfirmationCallback;

      const mockSignerFactory = {
        createDataSigner: () => ({
          signData: () =>
            of({ signature: 'mock-signature-cbor', key: 'mock-key-cbor' }),
        }),
      };

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of(mockAddresses),
        chainId$: of({
          networkId: 0,
          networkMagic: Cardano.NetworkMagics.Preprod,
        }),
        allAccounts$: of([mockAccount]),
        allWallets$: of([mockWallet]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        userConfirmationRequest: mockConfirmation,
        submitTransaction: vi.fn(),
        signerFactory: mockSignerFactory as unknown as CardanoSignerFactory,
        authenticate: vi
          .fn()
          .mockReturnValue(of(true)) as unknown as Authenticate,
        accessAuthSecret: vi
          .fn()
          .mockImplementation((callback: (secret: Uint8Array) => unknown) =>
            callback(new Uint8Array([1, 2, 3])),
          ) as unknown as AccessAuthSecret,
      });

      const result = await api.signData(
        PAYMENT_ADDRESS_1,
        'deadbeef',
        mockSender,
      );

      expect(result).toEqual({
        signature: 'mock-signature-cbor',
        key: 'mock-key-cbor',
      });
      expect(mockConfirmation).toHaveBeenCalledWith(
        mockSender.sender,
        'signData',
        { address: PAYMENT_ADDRESS_1, payload: 'deadbeef' },
      );
    });
  });

  describe('submitTx', () => {
    it('returns transaction hash on success', async () => {
      const accountId = AccountId('acc-1');
      const expectedTxHash = '0'.repeat(64);

      const mockSubmitTransaction = vi.fn().mockResolvedValue(expectedTxHash);

      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: mockSubmitTransaction,
      });

      const result = await api.submitTx('signed-tx-cbor');

      expect(result).toBe(expectedTxHash);
      expect(mockSubmitTransaction).toHaveBeenCalledWith('signed-tx-cbor');
    });
  });

  describe('getCollateral', () => {
    it('returns null when no unspendable UTXOs for account', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const senderContext = createMockSenderContext();
      const result = await api.getCollateral(undefined, senderContext);

      expect(result).toBeNull();
    });

    it('returns null when params provided but no unspendable UTXOs', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const senderContext = createMockSenderContext();
      const result = await api.getCollateral(
        { amount: '1000000' },
        senderContext,
      );

      expect(result).toBeNull();
    });
  });

  describe('getExtensions', () => {
    it('returns supported extensions array with CIP-95', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const result = await api.getExtensions();

      expect(result).toEqual([{ cip: 95 }]);
    });
  });

  describe('getNetworkMagic', () => {
    it('returns network magic from chainId$', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of({
          networkId: 0,
          networkMagic: Cardano.NetworkMagics.Preprod,
        } as Cardano.ChainId),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const result = await api.getNetworkMagic();

      expect(result).toBe(Cardano.NetworkMagics.Preprod);
    });

    it('throws InternalError when no active chain', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      try {
        await api.getNetworkMagic();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as { code: number }).code).toBe(
          APIErrorCode.InternalError,
        );
        expect((error as { info: string }).info).toBe('No active chain');
      }
    });
  });

  describe('CIP-95 Governance Methods', () => {
    it('getPubDRepKey throws error when account not found', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const senderContext = createMockSenderContext();
      try {
        await api.getPubDRepKey(senderContext);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as { code: number }).code).toBe(
          APIErrorCode.InternalError,
        );
        expect((error as { info: string }).info).toContain('Account not found');
      }
    });

    it('getRegisteredPubStakeKeys throws error when reward account details not found', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const senderContext = createMockSenderContext();
      try {
        await api.getRegisteredPubStakeKeys(senderContext);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as { code: number }).code).toBe(
          APIErrorCode.InternalError,
        );
        expect((error as { info: string }).info).toContain(
          'Reward account details not found',
        );
      }
    });

    it('getUnregisteredPubStakeKeys throws error when reward account details not found', async () => {
      const accountId = AccountId('acc-1');
      const api = new CardanoDappConnectorApi({
        ...defaultNewDeps,
        accountUtxos$: of({ [accountId]: [] } as unknown as AccountUtxoMap),
        addresses$: of([]),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: createMockGetAccountIdForOrigin(accountId),
        submitTransaction: vi.fn(),
      });

      const senderContext = createMockSenderContext();
      try {
        await api.getUnregisteredPubStakeKeys(senderContext);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as { code: number }).code).toBe(
          APIErrorCode.InternalError,
        );
        expect((error as { info: string }).info).toContain(
          'Reward account details not found',
        );
      }
    });
  });
});
