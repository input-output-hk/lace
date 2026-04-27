import { BigNumber } from '@lace-sdk/util';

import { TokenId } from '../../src';
import { formatTokenFullName, getTokenTickerFallback } from '../../src/utils';

import type { TokenContextData, Token } from '../../src';
import type { RawTokensState } from '../../src/store/slice/rawTokensSlice';
import type { StoredTokenMetadata } from '../../src/types';
import type { Address } from '@lace-contract/addresses';
import type { AccountId, WalletEntity } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

export const cardanoAccountId = 'cardano-acc-id' as AccountId;
export const cardanoAddress = 'cardano-address' as Address;
export const midnightAccountId = 'midnight-acc-id' as AccountId;
export const midnightAddress = 'midnight-address' as Address;

export const cardanoTokenContext: TokenContextData = {
  accountId: cardanoAccountId,
  address: cardanoAddress,
  blockchainName: 'Cardano',
};

export const cardanoAdaToken = {
  ...cardanoTokenContext,
  tokenId: TokenId('ADA'),
  metadata: {
    name: 'ADA',
    blockchainSpecific: {},
    ticker: 'ADA',
    image: 'someImage',
    decimals: 6,
  },
  decimals: 6,
  displayLongName: 'Cardano ADA',
  displayShortName: 'ADA',
  available: BigNumber(1_000_000n),
  pending: BigNumber(0n),
} satisfies Token;

export const cardanoOtherToken = {
  ...cardanoTokenContext,
  tokenId: TokenId('OTHER'),
  metadata: {
    name: 'OTHER',
    blockchainSpecific: {},
    ticker: 'OTHER',
    image: 'someImage',
    decimals: 4,
  },
  decimals: 4,
  displayLongName: 'OTHER TOKEN',
  displayShortName: 'OTH',
  available: BigNumber(2_000_000n),
  pending: BigNumber(1_000_000n),
} satisfies Token;

export const midnightTokenContext: TokenContextData = {
  accountId: midnightAccountId,
  address: midnightAddress,
  blockchainName: 'Midnight',
};

export const midnightToken = {
  ...midnightTokenContext,
  tokenId: TokenId('DUST'),
  metadata: {
    name: 'Midnight',
    blockchainSpecific: {},
    ticker: 'tDUST',
    image: 'someImage',
    decimals: 2,
  },
  decimals: 2,
  displayLongName: 'Midnight',
  displayShortName: 'tDUST',
  available: BigNumber(200n),
  pending: BigNumber(0n),
} satisfies Token;

export const createMockToken = ({
  id,
  accountId,
}: {
  id: string;
  accountId?: AccountId;
}): Omit<Token, 'metadata'> & { metadata: StoredTokenMetadata } => ({
  tokenId: TokenId(id),
  available: BigNumber(1n),
  pending: BigNumber(0n),
  accountId: accountId ?? ('test-account' as AccountId),
  address: 'test-address' as Address,
  blockchainName: 'Cardano',
  metadata: {
    blockchainSpecific: {},
    decimals: 0,
    isNft: true,
    tokenId: TokenId(id),
  },
  displayLongName: formatTokenFullName(id),
  displayShortName: getTokenTickerFallback(id),
  decimals: 0,
  unnamed: true,
});

// Test scenario builder types and utilities
export interface TokenDataOptions {
  tokenId: TokenId;
  accountId: AccountId;
  address: Address;
  available: bigint;
  blockchainName?: BlockchainName;
}

export interface TestScenario {
  rawTokensState: RawTokensState;
  walletsEntities?: Record<string, WalletEntity>;
}

export interface WalletDefinition {
  walletId: string;
  walletName?: string;
  accounts: Array<{
    accountId: AccountId;
    name?: string;
    blockchainName: BlockchainName;
  }>;
}

export const createTokenData = ({
  tokenId,
  accountId,
  address,
  available,
  blockchainName = 'Cardano',
}: TokenDataOptions) => ({
  tokenId,
  available: BigNumber(available),
  pending: BigNumber(0n),
  accountId,
  address,
  blockchainName,
});

export const createMockWallet = (
  walletId: string,
  accounts: Array<{
    accountId: string;
    name?: string;
    blockchainName: string;
  }>,
  walletName?: string,
): WalletEntity =>
  ({
    walletId,
    metadata: walletName ? { name: walletName, order: 0 } : undefined,
    accounts: accounts.map(accumulator => ({
      accountId: accumulator.accountId as AccountId,
      blockchainName: accumulator.blockchainName,
      metadata: accumulator.name ? { name: accumulator.name } : undefined,
      walletId,
    })),
  } as WalletEntity);

export const buildTestScenario = (
  tokens: TokenDataOptions[],
  wallets?: WalletDefinition[],
): TestScenario => {
  const rawTokensState: RawTokensState = {};

  // Build nested rawTokensState structure
  for (const token of tokens) {
    if (!rawTokensState[token.accountId]) {
      rawTokensState[token.accountId] = {};
    }
    const accountState = rawTokensState[token.accountId]!;
    if (!accountState[token.address]) {
      accountState[token.address] = {};
    }
    accountState[token.address]![token.tokenId] = createTokenData(token);
  }

  // Build walletsEntities structure
  const walletsEntities = wallets?.reduce((accumulator, wallet) => {
    accumulator[wallet.walletId] = createMockWallet(
      wallet.walletId,
      wallet.accounts,
      wallet.walletName,
    );
    return accumulator;
  }, {} as Record<string, WalletEntity>);

  return {
    rawTokensState,
    walletsEntities,
  };
};

// Test scenario mocks for selectTokenDistributionByTokenId tests
export const mockAccount1Id = 'account-1' as AccountId;
export const mockAccount2Id = 'account-2' as AccountId;
export const mockAccount3Id = 'account-3' as AccountId;
export const mockAddress1 = 'addr1_test_address_1' as Address;
export const mockAddress2 = 'addr2_test_address_2' as Address;
export const mockAddress3 = 'addr3_test_address_3' as Address;

export const createSingleAccountScenario = (tokenId: TokenId) =>
  buildTestScenario(
    [
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 1000000n,
      },
    ],
    [
      {
        walletId: 'wallet-1',
        walletName: 'Primary Wallet',
        accounts: [
          {
            accountId: mockAccount1Id,
            name: 'Main Account',
            blockchainName: 'Cardano',
          },
        ],
      },
    ],
  );

export const createMultiAddressScenario = (tokenId: TokenId) =>
  buildTestScenario(
    [
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 500000n,
      },
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress2,
        available: 300000n,
      },
    ],
    [
      {
        walletId: 'wallet-1',
        walletName: 'Test Wallet',
        accounts: [
          {
            accountId: mockAccount1Id,
            name: 'Multi-Address Account',
            blockchainName: 'Cardano',
          },
        ],
      },
    ],
  );

export const createMultiAccountScenario = (tokenId: TokenId) =>
  buildTestScenario(
    [
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 1000000n,
      },
      {
        tokenId,
        accountId: mockAccount2Id,
        address: mockAddress2,
        available: 2000000n,
      },
    ],
    [
      {
        walletId: 'wallet-1',
        walletName: 'Main Wallet',
        accounts: [
          {
            accountId: mockAccount1Id,
            name: 'Account 1',
            blockchainName: 'Cardano',
          },
          {
            accountId: mockAccount2Id,
            name: 'Account 2',
            blockchainName: 'Cardano',
          },
        ],
      },
    ],
  );

export const createZeroBalanceScenario = (
  tokenId: TokenId,
  otherTokenId: TokenId,
) =>
  buildTestScenario(
    [
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 1000000n,
      },
      {
        tokenId: otherTokenId,
        accountId: mockAccount2Id,
        address: mockAddress2,
        available: 500000n,
      },
    ],
    [
      {
        walletId: 'wallet-1',
        walletName: 'Test Wallet',
        accounts: [
          {
            accountId: mockAccount1Id,
            name: 'Account 1',
            blockchainName: 'Cardano',
          },
          {
            accountId: mockAccount2Id,
            name: 'Account 2',
            blockchainName: 'Cardano',
          },
        ],
      },
    ],
  );

export const createNoMetadataScenario = (tokenId: TokenId) =>
  buildTestScenario(
    [
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 1000000n,
      },
    ],
    [
      {
        walletId: 'wallet-1',
        walletName: 'Unnamed Account Wallet',
        accounts: [{ accountId: mockAccount1Id, blockchainName: 'Cardano' }],
      },
    ],
  );

export const createNoWalletsScenario = (tokenId: TokenId) =>
  buildTestScenario(
    [
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 1000000n,
      },
    ],
    [],
  );

export const createMultiWalletScenario = (tokenId: TokenId) =>
  buildTestScenario(
    [
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 1000000n,
      },
      {
        tokenId,
        accountId: mockAccount2Id,
        address: mockAddress2,
        available: 2000000n,
      },
      {
        tokenId,
        accountId: mockAccount3Id,
        address: mockAddress3,
        available: 3000000n,
        blockchainName: 'Midnight',
      },
    ],
    [
      {
        walletId: 'wallet-1',
        walletName: 'Cardano Wallet',
        accounts: [
          {
            accountId: mockAccount1Id,
            name: 'Cardano Account 1',
            blockchainName: 'Cardano',
          },
          {
            accountId: mockAccount2Id,
            name: 'Cardano Account 2',
            blockchainName: 'Cardano',
          },
        ],
      },
      {
        walletId: 'wallet-2',
        walletName: 'Midnight Wallet',
        accounts: [
          {
            accountId: mockAccount3Id,
            name: 'Midnight Account',
            blockchainName: 'Midnight',
          },
        ],
      },
    ],
  );

export const createDecimalBalanceScenario = (tokenId: TokenId) =>
  buildTestScenario(
    [
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 1234567n,
      },
    ],
    [
      {
        walletId: 'wallet-1',
        walletName: 'Decimal Test Wallet',
        accounts: [
          {
            accountId: mockAccount1Id,
            name: 'Test Account',
            blockchainName: 'Cardano',
          },
        ],
      },
    ],
  );

export const createMixedTokenScenario = (
  tokenId: TokenId,
  otherTokenId: TokenId,
) =>
  buildTestScenario(
    [
      {
        tokenId: otherTokenId,
        accountId: mockAccount1Id,
        address: mockAddress1,
        available: 1000000n,
      },
      {
        tokenId,
        accountId: mockAccount1Id,
        address: mockAddress2,
        available: 500000n,
      },
    ],
    [
      {
        walletId: 'wallet-1',
        walletName: 'Mixed Token Wallet',
        accounts: [
          {
            accountId: mockAccount1Id,
            name: 'Test Account',
            blockchainName: 'Cardano',
          },
        ],
      },
    ],
  );

// Test case configurations for totals aggregation tests
export interface TotalsTestCase {
  name: string;
  scenarioFn: (tokenId: TokenId) => TestScenario;
  expectedTotal: bigint;
  formattedQuantity: string;
}

export const createSingleAccountTotalsTestCase = (): TotalsTestCase => ({
  name: 'should calculate totals for single account with token balance',
  scenarioFn: createSingleAccountScenario,
  expectedTotal: 1000000n,
  formattedQuantity: '1000000.000000',
});

export const createMultiAccountTotalsTestCase = (): TotalsTestCase => ({
  name: 'should aggregate totals across multiple accounts',
  scenarioFn: createMultiAccountScenario,
  expectedTotal: 3000000n, // 1000000 + 2000000
  formattedQuantity: '3000000.000000',
});

export const createMultiAddressTotalsTestCase = (): TotalsTestCase => ({
  name: 'should aggregate totals across multiple addresses in same account',
  scenarioFn: createMultiAddressScenario,
  expectedTotal: 800000n, // 500000 + 300000
  formattedQuantity: '800000.000000',
});

export const createMultiWalletTotalsTestCase = (): TotalsTestCase => ({
  name: 'should aggregate totals across multiple wallets',
  scenarioFn: createMultiWalletScenario,
  expectedTotal: 6000000n, // 1000000 + 2000000 + 3000000
  formattedQuantity: '6000000.000000',
});

export const getAllTotalsTestCases = (): TotalsTestCase[] => [
  createSingleAccountTotalsTestCase(),
  createMultiAccountTotalsTestCase(),
  createMultiAddressTotalsTestCase(),
  createMultiWalletTotalsTestCase(),
];
