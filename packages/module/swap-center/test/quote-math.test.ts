import { describe, expect, it } from 'vitest';

import {
  effectiveSellPerBuy,
  formatLovelaceAsAda,
  formatSellPerBuy,
  isSwapUnderfunded,
  maxSellableBaseAmount,
  requiredAdaForSwap,
  swapAdaOverhead,
} from '../src/quote-math';

import type { SwapQuote } from '@lace-contract/swap-provider';

const HOSKY = 'policy-hosky';

/** 10 ADA → 200 HOSKY, 0.69 batcher + 1.00 service, 2.00 deposit. */
const quoteFixture = (overrides: Partial<SwapQuote> = {}): SwapQuote =>
  ({
    buyTokenId: HOSKY,
    deposit: {
      amount: '2000000',
      displayAmount: '2.00',
      displayCurrency: 'ADA',
    },
    expectedBuyAmount: '200000000',
    fees: [
      {
        amount: '690000',
        displayAmount: '0.69',
        displayCurrency: 'ADA',
        label: 'v2.swap.review.network-fee',
        tokenId: 'lovelace',
      },
      {
        amount: '1000000',
        displayAmount: '1.00',
        displayCurrency: 'ADA',
        label: 'v2.swap.review.service-fee',
        tokenId: 'lovelace',
      },
    ],
    price: 20,
    priceDisplay: '20.000000',
    providerId: 'steelswap',
    quoteExpiresAt: 0,
    route: [],
    routeId: 'route-1',
    sellAmount: '10000000',
    sellTokenId: 'lovelace',
    totalFeeDisplay: '1.69 ADA',
    ...overrides,
  } as SwapQuote);

describe('swapAdaOverhead', () => {
  it('sums the lovelace fees, the deposit and the headroom', () => {
    expect(swapAdaOverhead(quoteFixture())).toBe(
      // 0.69 batcher + 1.00 service + 2.00 deposit + 3.00 headroom
      6_690_000n,
    );
  });

  it('counts a refundable deposit — the account still has to hold it', () => {
    expect(
      swapAdaOverhead(quoteFixture()) -
        swapAdaOverhead(quoteFixture({ deposit: undefined })),
    ).toBe(2_000_000n);
  });

  it('ignores fees charged in another token', () => {
    const quote = quoteFixture({
      fees: [
        {
          amount: '5000',
          displayAmount: '0.05',
          displayCurrency: 'HOSKY',
          label: 'v2.swap.review.service-fee',
          tokenId: HOSKY,
        },
      ],
    });
    expect(swapAdaOverhead(quote)).toBe(5_000_000n);
  });

  it('degrades instead of throwing on an unparsable provider amount', () => {
    const quote = quoteFixture({
      deposit: { amount: '', displayAmount: '', displayCurrency: 'ADA' },
      fees: [
        {
          amount: 'not-a-number',
          displayAmount: '?',
          displayCurrency: 'ADA',
          label: 'v2.swap.review.network-fee',
          tokenId: 'lovelace',
        },
      ],
    });
    expect(swapAdaOverhead(quote)).toBe(3_000_000n);
  });
});

describe('maxSellableBaseAmount', () => {
  it('holds back the overhead when selling ADA', () => {
    expect(
      maxSellableBaseAmount({
        available: 12_000_000n,
        overhead: 6_690_000n,
        sellTokenId: 'lovelace',
      }),
    ).toBe(5_310_000n);
  });

  it('offers the whole balance when selling a token', () => {
    expect(
      maxSellableBaseAmount({
        available: 12_000_000n,
        overhead: 6_690_000n,
        sellTokenId: HOSKY,
      }),
    ).toBe(12_000_000n);
  });

  it('falls back to the observed CSWAP overhead before any quote exists', () => {
    expect(
      maxSellableBaseAmount({
        available: 10_000_000n,
        overhead: undefined,
        sellTokenId: 'lovelace',
      }),
    ).toBe(3_310_000n);
  });

  it('offers nothing rather than a negative amount', () => {
    expect(
      maxSellableBaseAmount({
        available: 1_000_000n,
        overhead: 6_690_000n,
        sellTokenId: 'lovelace',
      }),
    ).toBe(0n);
  });
});

describe('requiredAdaForSwap', () => {
  it('adds the sold amount when ADA is what is being sold', () => {
    expect(
      requiredAdaForSwap({
        quote: quoteFixture(),
        sellAmountBase: 1_000_000n,
        sellTokenId: 'lovelace',
      }),
    ).toBe(7_690_000n);
  });

  it('is the overhead alone on a token sell', () => {
    expect(
      requiredAdaForSwap({
        quote: quoteFixture({ sellTokenId: HOSKY }),
        sellAmountBase: 500_000_000n,
        sellTokenId: HOSKY,
      }),
    ).toBe(6_690_000n);
  });

  it('is exactly the threshold isSwapUnderfunded enforces', () => {
    const quote = quoteFixture();
    const required = requiredAdaForSwap({
      quote,
      sellAmountBase: 1_000_000n,
      sellTokenId: 'lovelace',
    });
    const at = {
      quote,
      sellAmountBase: 1_000_000n,
      sellTokenAvailable: 1_000_000_000n,
      sellTokenId: 'lovelace',
    };
    expect(isSwapUnderfunded({ ...at, adaAvailable: required })).toBe(false);
    expect(isSwapUnderfunded({ ...at, adaAvailable: required - 1n })).toBe(
      true,
    );
  });
});

describe('formatLovelaceAsAda', () => {
  it('renders ADA at the 2 decimals the fee rows use', () => {
    expect(formatLovelaceAsAda(7_690_000n)).toBe('7.69');
    expect(formatLovelaceAsAda(0n)).toBe('0.00');
  });
});

describe('isSwapUnderfunded', () => {
  const base = {
    adaAvailable: 12_000_000n,
    quote: quoteFixture(),
    sellTokenAvailable: 12_000_000n,
    sellTokenId: 'lovelace',
  };

  it('passes an amount the balance covers with room for the overhead', () => {
    expect(isSwapUnderfunded({ ...base, sellAmountBase: 5_000_000n })).toBe(
      false,
    );
  });

  it('catches the amount production let through: 7 ADA of a 12 ADA balance', () => {
    expect(isSwapUnderfunded({ ...base, sellAmountBase: 7_000_000n })).toBe(
      true,
    );
  });

  it('catches Max — the whole balance never leaves room for fees', () => {
    expect(isSwapUnderfunded({ ...base, sellAmountBase: 12_000_000n })).toBe(
      true,
    );
  });

  it('charges the ADA overhead against the ADA balance on a token sell', () => {
    const tokenSell = {
      ...base,
      adaAvailable: 1_000_000n,
      quote: quoteFixture({ sellTokenId: HOSKY }),
      sellTokenAvailable: 500_000_000n,
      sellTokenId: HOSKY,
    };
    expect(isSwapUnderfunded({ ...tokenSell, sellAmountBase: 1n })).toBe(true);
    expect(
      isSwapUnderfunded({
        ...tokenSell,
        adaAvailable: 20_000_000n,
        sellAmountBase: 1n,
      }),
    ).toBe(false);
  });

  it('still flags an amount beyond the sold token balance', () => {
    expect(
      isSwapUnderfunded({
        ...base,
        quote: undefined,
        sellAmountBase: 13_000_000n,
      }),
    ).toBe(true);
  });

  it('stays quiet on a zero amount', () => {
    expect(isSwapUnderfunded({ ...base, sellAmountBase: 0n })).toBe(false);
  });

  it('cannot judge the ADA side before a quote or a known ADA balance', () => {
    expect(
      isSwapUnderfunded({
        ...base,
        quote: undefined,
        sellAmountBase: 7_000_000n,
      }),
    ).toBe(false);
    expect(
      isSwapUnderfunded({
        ...base,
        adaAvailable: undefined,
        sellAmountBase: 7_000_000n,
      }),
    ).toBe(false);
  });
});

describe('effectiveSellPerBuy', () => {
  it('includes every fee charged in the sold token', () => {
    // (10 + 0.69 + 1.00) ADA ÷ 200 HOSKY
    expect(
      effectiveSellPerBuy({
        buyDecimals: 6,
        quote: quoteFixture(),
        sellDecimals: 6,
      }),
    ).toBeCloseTo(0.058_45, 5);
  });

  it('excludes the deposit, which comes back', () => {
    expect(
      effectiveSellPerBuy({
        buyDecimals: 6,
        quote: quoteFixture({ deposit: undefined }),
        sellDecimals: 6,
      }),
    ).toBeCloseTo(0.058_45, 5);
  });

  it('corrects for sides with different decimals', () => {
    expect(
      effectiveSellPerBuy({
        buyDecimals: 8,
        quote: quoteFixture(),
        sellDecimals: 6,
      }),
    ).toBeCloseTo(5.845, 3);
  });

  it('ignores fees charged in the bought token', () => {
    const quote = quoteFixture({
      fees: [
        {
          amount: '100000000',
          displayAmount: '100',
          displayCurrency: 'HOSKY',
          label: 'v2.swap.review.service-fee',
          tokenId: HOSKY,
        },
      ],
    });
    expect(
      effectiveSellPerBuy({ buyDecimals: 6, quote, sellDecimals: 6 }),
    ).toBeCloseTo(0.05, 5);
  });

  it('is undefined when either side of the rate is unknown', () => {
    const quote = quoteFixture();
    expect(
      effectiveSellPerBuy({ buyDecimals: undefined, quote, sellDecimals: 6 }),
    ).toBeUndefined();
    expect(
      effectiveSellPerBuy({ buyDecimals: 6, quote, sellDecimals: undefined }),
    ).toBeUndefined();
    expect(
      effectiveSellPerBuy({
        buyDecimals: 6,
        quote: quoteFixture({ expectedBuyAmount: '0' }),
        sellDecimals: 6,
      }),
    ).toBeUndefined();
    expect(
      effectiveSellPerBuy({
        buyDecimals: 6,
        quote: quoteFixture({ expectedBuyAmount: 'nope' }),
        sellDecimals: 6,
      }),
    ).toBeUndefined();
    expect(
      effectiveSellPerBuy({
        buyDecimals: 6,
        quote: quoteFixture({ sellAmount: 'nope' }),
        sellDecimals: 6,
      }),
    ).toBeUndefined();
  });
});

describe('formatSellPerBuy', () => {
  it('renders at 6 decimals and passes undefined through', () => {
    expect(formatSellPerBuy(0.058_45)).toBe('0.058450');
    expect(formatSellPerBuy(undefined)).toBeUndefined();
  });
});
