import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lace-lib/ui-toolkit', () => ({
  getAssetImageUrl: vi.fn(),
}));

vi.mock('@lace-contract/token-pricing', () => ({
  calculatePortfolioValueOverTime: vi.fn(() => [{ price: 10 }, { price: 20 }]),
  getTokenPriceId: vi.fn((token: { tokenId: string }) => token.tokenId),
}));

import { transformAccountToCard } from '../../src/pages/portfolio/accountCardTransformer';

import type {
  TokenPrice,
  TokenPriceHistory,
  TokenPriceId,
} from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';
import type { AnyAccount } from '@lace-contract/wallet-repo';

describe('accountCardTransformer', () => {
  const createMockAccount = (
    blockchainName: string,
    accountId: string,
  ): AnyAccount =>
    ({
      accountId: AccountId(accountId),
      walletId: WalletId('test-wallet'),
      blockchainName,
      accountType: 'InMemory',
      metadata: { name: 'Test Account' },
    } as unknown as AnyAccount);

  const createMockToken = ({
    tokenId,
    available,
    decimals,
    displayDecimalPlaces,
    displayLongName = tokenId,
    displayShortName = tokenId,
  }: {
    tokenId: string;
    available: bigint;
    decimals: number;
    displayDecimalPlaces?: number;
    displayLongName?: string;
    displayShortName?: string;
  }): Token =>
    ({
      tokenId,
      available: BigNumber(available),
      pending: BigNumber(0n),
      decimals,
      displayDecimalPlaces,
      displayLongName,
      displayShortName,
    } as unknown as Token);

  const defaultParams = {
    index: 0,
    tokensGroupedByAccount: {},
    currency: { name: 'USD', ticker: '$' },
    portfolioActions: {
      onBuyPress: () => {},
      onSendPress: () => {},
      onReceivePress: () => {},
    },
    arePricesAvailable: true,
    createSendAction: () => () => {},
    createAccountsAction: () => () => {},
    getAccountName: (index: number) => `Account ${index + 1}`,
    getAccountType: (blockchainName: string) => `${blockchainName} Account`,
    priceHistory: {},
    prices: {},
    timeRange: '24H' as const,
    rewardsByAccount: {},
    compromisedSuffixByAccount: {},
    getNativeTokenInfo: () => undefined,
  };

  describe('variant selection', () => {
    it("should always use 'standard' variant", () => {
      const cardanoAccount = createMockAccount('Cardano', 'cardano-account-1');
      const midnightAccount = createMockAccount(
        'Midnight',
        'midnight-account-1',
      );
      const bitcoinAccount = createMockAccount('Bitcoin', 'bitcoin-account-1');

      expect(
        transformAccountToCard({ ...defaultParams, account: cardanoAccount })
          .variant,
      ).toBe('standard');
      expect(
        transformAccountToCard({ ...defaultParams, account: midnightAccount })
          .variant,
      ).toBe('standard');
      expect(
        transformAccountToCard({ ...defaultParams, account: bitcoinAccount })
          .variant,
      ).toBe('standard');
    });
  });

  describe('buy action', () => {
    it('should include buy action when portfolioActions has onBuyPress', () => {
      const account = createMockAccount('Cardano', 'cardano-account-1');

      const result = transformAccountToCard({
        ...defaultParams,
        account,
      });

      expect(result.onBuyPress).toBeDefined();
    });

    it('should not include buy action when portfolioActions omits onBuyPress', () => {
      const account = createMockAccount('Cardano', 'cardano-account-1');

      const result = transformAccountToCard({
        ...defaultParams,
        account,
        portfolioActions: {
          onSendPress: () => {},
          onReceivePress: () => {},
        },
      });

      expect(result.onBuyPress).toBeUndefined();
    });
  });

  describe('basic card properties', () => {
    it('should set correct blockchain and coin for Cardano', () => {
      const account = createMockAccount('Cardano', 'cardano-account-1');

      const result = transformAccountToCard({
        ...defaultParams,
        account,
      });

      expect(result.blockchain).toBe('Cardano');
      expect(result.coin).toBe('');
    });

    it('should set correct blockchain and coin for Midnight', () => {
      const account = createMockAccount('Midnight', 'midnight-account-1');

      const result = transformAccountToCard({
        ...defaultParams,
        account,
      });

      expect(result.blockchain).toBe('Midnight');
      expect(result.coin).toBe('');
    });

    it('should use account metadata name when available', () => {
      const account = createMockAccount('Cardano', 'cardano-account-1');

      const result = transformAccountToCard({
        ...defaultParams,
        account,
      });

      expect(result.accountName).toBe('Test Account');
    });

    it('should fall back to getAccountName when metadata is missing', () => {
      const account = {
        ...createMockAccount('Cardano', 'cardano-account-1'),
        metadata: undefined,
      } as unknown as AnyAccount;

      const result = transformAccountToCard({
        ...defaultParams,
        account,
        index: 2,
      });

      expect(result.accountName).toBe('Account 3');
    });

    it('should set native coin and balance from account token data', () => {
      const account = createMockAccount('Cardano', 'cardano-account-1');
      const adaToken = createMockToken({
        tokenId: 'ada',
        available: 123_456_789n,
        decimals: 6,
        displayDecimalPlaces: 2,
        displayLongName: 'Cardano',
        displayShortName: 'ADA',
      });

      const result = transformAccountToCard({
        ...defaultParams,
        account,
        tokensGroupedByAccount: {
          [account.accountId]: {
            fungible: [
              createMockToken({
                tokenId: 'other',
                available: 999n,
                decimals: 0,
              }),
              adaToken,
            ],
          },
        },
        getNativeTokenInfo: blockchainName =>
          blockchainName === 'Cardano'
            ? {
                tokenId: 'ada',
                decimals: 6,
                displayShortName: 'ADA',
              }
            : undefined,
      });

      expect(result.balanceCoin).toBe('123.45');
      expect(result.coin).toBe('ADA');
    });

    it('should fall back to zero balance when native token is missing', () => {
      const account = createMockAccount('Cardano', 'cardano-account-1');

      const result = transformAccountToCard({
        ...defaultParams,
        account,
        getNativeTokenInfo: blockchainName =>
          blockchainName === 'Cardano'
            ? {
                tokenId: 'ada',
                decimals: 6,
                displayShortName: 'ADA',
              }
            : undefined,
      });

      expect(result.balanceCoin).toBe('0');
      expect(result.coin).toBe('ADA');
    });

    it('should derive fiat balance, rewards, and chart data from actual inputs', () => {
      const account = createMockAccount('Cardano', 'cardano-account-1');
      const adaToken = createMockToken({
        tokenId: 'ada',
        available: 1_500_000n,
        decimals: 6,
      });

      const result = transformAccountToCard({
        ...defaultParams,
        account,
        tokensGroupedByAccount: {
          [account.accountId]: {
            fungible: [adaToken],
          },
        },
        getNativeTokenInfo: blockchainName =>
          blockchainName === 'Cardano'
            ? {
                tokenId: 'ada',
                decimals: 6,
                displayShortName: 'ADA',
              }
            : undefined,
        prices: {
          ['ada' as TokenPriceId]: { price: 2 } as TokenPrice,
        },
        priceHistory: {
          ['ada' as TokenPriceId]: {
            '24H': [{ price: 1, timestamp: 1 }],
          } as unknown as TokenPriceHistory,
        },
        rewardsByAccount: {
          [account.accountId]: '1.23',
        },
      });

      expect(result.balanceCurrency).toBe('3.00');
      expect(result.rewards).toBe('1.23');
      expect(result.chartData).toEqual([10, 20]);
    });

    it('should omit dashboard press because the account card prop is optional', () => {
      const account = createMockAccount('Cardano', 'cardano-account-1');

      const result = transformAccountToCard({
        ...defaultParams,
        account,
      });

      expect(result.onDashboardPress).toBeUndefined();
    });
  });
});
