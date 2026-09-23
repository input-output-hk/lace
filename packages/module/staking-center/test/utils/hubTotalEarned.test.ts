import { TokenId } from '@lace-contract/tokens';
import { describe, expect, it } from 'vitest';

import { formatHubTotalEarned } from '../../src/utils/hubTotalEarned';

import type { CurrencyPreference } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';

const susdrId = TokenId('policy.susdr');
const usd: CurrencyPreference = {
  name: 'USD',
  ticker: '$',
} as CurrencyPreference;

const susdrBalance = (baseUnits: string) => ({
  tokenId: susdrId,
  available: baseUnits as Token['available'],
  decimals: 6,
});

describe('formatHubTotalEarned', () => {
  it('combines Cardano rewards (at the ADA/USD price) with token earnings', () => {
    // 100 ADA rewards × $0.50 + 1,000 sUSDr × $0.02 = $70.
    expect(
      formatHubTotalEarned({
        cardanoRewardsLovelace: '100000000',
        adaPriceUsd: 0.5,
        earnedTokens: [{ tokenId: susdrId, earnedUsdPerUnit: 0.02 }],
        aggregatedFungibleTokens: [susdrBalance('1000000000')],
        currencyContext: { currency: usd, usdToCurrencyRate: undefined },
      }),
    ).toBe('70.00 USD');
  });

  it('converts the combined USD total to the selected display currency', () => {
    expect(
      formatHubTotalEarned({
        cardanoRewardsLovelace: '100000000',
        adaPriceUsd: 0.5,
        earnedTokens: [],
        aggregatedFungibleTokens: [],
        currencyContext: {
          currency: { name: 'EUR', ticker: '€' } as CurrencyPreference,
          usdToCurrencyRate: 2,
        },
      }),
    ).toBe('100.00 EUR');
  });

  it('shows the Cardano leg in ADA while ADA is unpriced, never an endless shimmer', () => {
    expect(
      formatHubTotalEarned({
        cardanoRewardsLovelace: '100000000',
        adaPriceUsd: undefined,
        earnedTokens: [{ tokenId: susdrId, earnedUsdPerUnit: 0.02 }],
        aggregatedFungibleTokens: [susdrBalance('1000000000')],
        currencyContext: { currency: usd, usdToCurrencyRate: undefined },
      }),
    ).toBe('100.00 ADA + 20.00 USD');
    // Rewards-only wallets show just the ADA amount.
    expect(
      formatHubTotalEarned({
        cardanoRewardsLovelace: '100000000',
        adaPriceUsd: undefined,
        earnedTokens: [],
        aggregatedFungibleTokens: [],
        currencyContext: { currency: usd, usdToCurrencyRate: undefined },
      }),
    ).toBe('100.00 ADA');
  });

  it('needs no ADA price when there are no Cardano rewards', () => {
    expect(
      formatHubTotalEarned({
        cardanoRewardsLovelace: '0',
        adaPriceUsd: undefined,
        earnedTokens: [{ tokenId: susdrId, earnedUsdPerUnit: 0.02 }],
        aggregatedFungibleTokens: [susdrBalance('1000000000')],
        currencyContext: { currency: usd, usdToCurrencyRate: undefined },
      }),
    ).toBe('20.00 USD');
  });

  it('renders zero earnings as "0 USD"', () => {
    expect(
      formatHubTotalEarned({
        cardanoRewardsLovelace: '0',
        adaPriceUsd: undefined,
        earnedTokens: [{ tokenId: susdrId, earnedUsdPerUnit: 0 }],
        aggregatedFungibleTokens: [susdrBalance('1000000000')],
        currencyContext: { currency: usd, usdToCurrencyRate: undefined },
      }),
    ).toBe('0 USD');
  });
});
