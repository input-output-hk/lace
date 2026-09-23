import { TokenId } from '@lace-contract/tokens';
import { describe, expect, it } from 'vitest';

import { formatProductCardBalance } from '../../src/utils/productCardBalance';

import type { ProductCardCurrencyContext } from '../../src/utils/productCardBalance';
import type { Token } from '@lace-contract/tokens';

const token = (
  tokenId: string,
  available: string,
  decimals: number,
): Pick<Token, 'available' | 'decimals' | 'tokenId'> => ({
  tokenId: TokenId(tokenId),
  available: available as Token['available'],
  decimals,
});

const usd: ProductCardCurrencyContext = {
  currency: { name: 'USD', ticker: '$' },
  usdToCurrencyRate: 1,
};

describe('formatProductCardBalance', () => {
  it('falls back to totalBalanceUsdDisplay when the card declares no usdBalance', () => {
    expect(
      formatProductCardBalance(
        { totalBalanceUsdDisplay: '$12.34' },
        { usdBalance: undefined, aggregatedFungibleTokens: [] },
        usd,
      ),
    ).toBe('$12.34');
  });

  it('renders "0 USD" without decimals when the total is zero', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = { tokens: [{ tokenId: TokenId('usdr'), usdRate: 1 }] };

    expect(
      formatProductCardBalance(
        card,
        { usdBalance, aggregatedFungibleTokens: [token('usdr', '0', 6)] },
        usd,
      ),
    ).toBe('0 USD');
  });

  it('formats a single token balance with two decimals', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = { tokens: [{ tokenId: TokenId('usdr'), usdRate: 1 }] };

    expect(
      formatProductCardBalance(
        card,
        { usdBalance, aggregatedFungibleTokens: [token('usdr', '1234560', 6)] },
        usd,
      ),
    ).toBe('1.23 USD');
  });

  it('adds pending-unstake USD on top of the wallet-token sum', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = { tokens: [{ tokenId: TokenId('usdr'), usdRate: 1 }] };

    expect(
      formatProductCardBalance(
        card,
        { usdBalance, aggregatedFungibleTokens: [token('usdr', '1000000', 6)] },
        {
          ...usd,
          pendingUsd: 2.5,
        },
      ),
    ).toBe('3.50 USD');
    // Pending funds alone still render a non-zero balance.
    expect(
      formatProductCardBalance(
        card,
        { usdBalance, aggregatedFungibleTokens: [] },
        {
          ...usd,
          pendingUsd: 2.5,
        },
      ),
    ).toBe('2.50 USD');
  });

  it('sums multiple tokens each valued at its own usdRate', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = {
      tokens: [
        { tokenId: TokenId('usdr'), usdRate: 1 },
        { tokenId: TokenId('susdr'), usdRate: 1.5 },
      ],
    };

    expect(
      formatProductCardBalance(
        card,
        {
          usdBalance,
          aggregatedFungibleTokens: [
            token('usdr', '10000000', 6),
            token('susdr', '2000000', 6),
          ],
        },
        usd,
      ),
    ).toBe('13.00 USD');
  });

  it('treats tokens missing from the balance list as zero', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = {
      tokens: [
        { tokenId: TokenId('usdr'), usdRate: 1 },
        { tokenId: TokenId('susdr'), usdRate: 2 },
      ],
    };

    expect(
      formatProductCardBalance(
        card,
        { usdBalance, aggregatedFungibleTokens: [token('usdr', '5000000', 6)] },
        usd,
      ),
    ).toBe('5.00 USD');
  });

  it('renders "0 USD" when none of the declared tokens are in the balance list', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = { tokens: [{ tokenId: TokenId('usdr'), usdRate: 1 }] };

    expect(
      formatProductCardBalance(
        card,
        { usdBalance, aggregatedFungibleTokens: [] },
        usd,
      ),
    ).toBe('0 USD');
  });

  it('converts the USD total into the selected currency', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = { tokens: [{ tokenId: TokenId('usdr'), usdRate: 1 }] };

    expect(
      formatProductCardBalance(
        card,
        {
          usdBalance,
          aggregatedFungibleTokens: [token('usdr', '10000000', 6)],
        },
        {
          currency: { name: 'EUR', ticker: '€' },
          usdToCurrencyRate: 0.9,
        },
      ),
    ).toBe('9.00 EUR');
  });

  it('labels the zero state with the selected currency', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = { tokens: [{ tokenId: TokenId('usdr'), usdRate: 1 }] };

    expect(
      formatProductCardBalance(
        card,
        { usdBalance, aggregatedFungibleTokens: [] },
        {
          currency: { name: 'EUR', ticker: '€' },
          usdToCurrencyRate: 0.9,
        },
      ),
    ).toBe('0 EUR');
  });

  it('falls back to USD while no conversion rate is available', () => {
    const card = { totalBalanceUsdDisplay: '$0.00' };
    const usdBalance = { tokens: [{ tokenId: TokenId('usdr'), usdRate: 1 }] };

    expect(
      formatProductCardBalance(
        card,
        {
          usdBalance,
          aggregatedFungibleTokens: [token('usdr', '10000000', 6)],
        },
        {
          currency: { name: 'EUR', ticker: '€' },
          usdToCurrencyRate: undefined,
        },
      ),
    ).toBe('10.00 USD');
  });
});
