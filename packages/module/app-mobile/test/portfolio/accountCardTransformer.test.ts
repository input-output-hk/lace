import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lace-lib/ui-toolkit', () => ({
  getAssetImageUrl: vi.fn(),
}));

import { transformAccountToCard } from '../../src/pages/portfolio/accountCardTransformer';

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
    nativeTokenPriceByBlockchain: {},
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
  });
});
