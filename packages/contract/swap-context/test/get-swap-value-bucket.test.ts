import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { describe, expect, it } from 'vitest';

import { getSwapValueAnalytics } from '../src/get-swap-value-bucket';

import type { SwapQuote } from '@lace-contract/swap-provider';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';

const ADA_PRICE_ID = CardanoTokenPriceId(LOVELACE_TOKEN_ID);

const quote = (overrides: Partial<SwapQuote>): SwapQuote => ({
  routeId: 'route-1',
  providerId: 'steelswap',
  sellTokenId: 'lovelace',
  buyTokenId: 'abc123',
  sellAmount: '10000000',
  expectedBuyAmount: '500',
  price: 0.00005,
  priceDisplay: '0.000050',
  fees: [],
  totalFeeDisplay: '0 ADA',
  route: [],
  quoteExpiresAt: 0,
  ...overrides,
});

// $0.50/ADA keeps the arithmetic legible: lovelace / 2e6 = USD.
const adaAt = (priceInUsd: number): Record<TokenPriceId, TokenPrice> => ({
  [ADA_PRICE_ID]: {
    priceInUsd,
    price: priceInUsd,
    lastUpdated: Date.now(),
  } as TokenPrice,
});

const PRICES = adaAt(0.5);
const NO_PRICES: Record<TokenPriceId, TokenPrice> = {};

describe('getSwapValueAnalytics', () => {
  const bucketOf = (...args: Parameters<typeof getSwapValueAnalytics>) =>
    getSwapValueAnalytics(...args).swapValue;
  const adaOf = (...args: Parameters<typeof getSwapValueAnalytics>) =>
    getSwapValueAnalytics(...args).swapValueAda;

  describe('bucketing the ADA sell leg', () => {
    // Each USD threshold twice: the largest value still inside a bucket, and
    // the threshold itself, which belongs to the next bucket up.
    it.each([
      [1, 'XS'],
      [19_999_999, 'XS'],
      [20_000_000, 'S'],
      [199_999_999, 'S'],
      [200_000_000, 'M'],
      [999_999_999, 'M'],
      [1_000_000_000, 'L'],
      [4_999_999_999, 'L'],
      [5_000_000_000, 'XL'],
      [19_999_999_999, 'XL'],
      [20_000_000_000, 'XXL'],
      [99_999_999_999, 'XXL'],
      [100_000_000_000, 'XXXL'],
      [199_999_999_999, 'XXXL'],
      [200_000_000_000, 'WHALE'],
    ])('buckets %s lovelace as %s', (lovelace, bucket) => {
      expect(
        bucketOf(quote({ sellAmount: String(lovelace) }), undefined, PRICES),
      ).toBe(bucket);
    });
  });

  it('measures the buy side when ADA is the token being bought', () => {
    expect(
      getSwapValueAnalytics(
        quote({
          sellTokenId: 'abc123',
          buyTokenId: 'lovelace',
          sellAmount: '1',
          expectedBuyAmount: '600000000',
        }),
        undefined,
        PRICES,
      ),
    ).toStrictEqual({
      swapValue: 'M',
      swapValueAda: 600,
      swapValueSource: 'ada-leg',
    });
  });

  it('prefers the sell side when both legs are ADA', () => {
    expect(
      bucketOf(
        quote({
          buyTokenId: 'lovelace',
          sellAmount: '600000000',
          expectedBuyAmount: '200000000000',
        }),
        undefined,
        PRICES,
      ),
    ).toBe('M');
  });

  it('tracks the ADA price rather than the lovelace amount', () => {
    const sameQuote = quote({ sellAmount: '100000000' });
    expect(bucketOf(sameQuote, undefined, adaAt(0.5))).toBe('S');
    expect(bucketOf(sameQuote, undefined, adaAt(20))).toBe('L');
  });

  it('reports UNKNOWN when the ADA leg exists but ADA is unpriced', () => {
    expect(
      getSwapValueAnalytics(quote({}), undefined, NO_PRICES),
    ).toStrictEqual({
      swapValue: 'UNKNOWN',
      swapValueAda: 10,
      swapValueSource: 'ada-leg',
    });
  });

  it('reports UNKNOWN when the cached ADA price is stale', () => {
    const stale = {
      [ADA_PRICE_ID]: {
        priceInUsd: 0.5,
        price: 0.5,
        lastUpdated: Date.now(),
        isStale: true,
      } as TokenPrice,
    };
    expect(bucketOf(quote({}), undefined, stale)).toBe('UNKNOWN');
  });

  it.each(['not-a-number', 'undefined', '1.5'])(
    'reports UNKNOWN with no summable size for the unparsable amount %o',
    sellAmount => {
      expect(
        getSwapValueAnalytics(quote({ sellAmount }), undefined, PRICES),
      ).toStrictEqual({ swapValue: 'UNKNOWN' });
    },
  );

  it.each(['', '0', '-1000000'])(
    'reports UNKNOWN with no summable size for the non-positive amount %o',
    sellAmount => {
      expect(
        getSwapValueAnalytics(quote({ sellAmount }), undefined, PRICES),
      ).toStrictEqual({ swapValue: 'UNKNOWN' });
    },
  );

  describe('the summable ADA size of an ADA leg', () => {
    it.each([
      ['1', 0.000_001],
      ['10000000', 10],
      ['600000000', 600],
      ['200000000000', 200_000],
    ])('converts %o lovelace to %o ADA', (sellAmount, ada) => {
      expect(adaOf(quote({ sellAmount }), undefined, PRICES)).toBe(ada);
    });

    it('is price-free, so it survives a pricing outage', () => {
      expect(
        adaOf(quote({ sellAmount: '10000000' }), undefined, NO_PRICES),
      ).toBe(10);
    });
  });

  describe('pricing a token-to-token trade through its sell token', () => {
    const HOSKY = {
      blockchainName: 'Cardano',
      decimals: 2,
      // Present because decimals are only trusted once metadata has loaded.
      metadata: { decimals: 2 },
      tokenId: 'abc123',
    } as Token;
    const t2t = quote({ buyTokenId: 'def456', sellTokenId: 'abc123' });

    // ADA at $0.50 and the sell token at $2.50 => 1 token is 5 ADA.
    const pricedBoth: Record<TokenPriceId, TokenPrice> = {
      [ADA_PRICE_ID]: {
        lastUpdated: Date.now(),
        price: 0.5,
        priceInUsd: 0.5,
      } as TokenPrice,
      [CardanoTokenPriceId('abc123')]: {
        lastUpdated: Date.now(),
        price: 2.5,
        priceInUsd: 2.5,
      } as TokenPrice,
    };

    it('values the trade through the sell token, and buckets it too', () => {
      // 1000 smallest units at 2 decimals is 10 whole tokens: $25 -> 50 ADA.
      expect(
        getSwapValueAnalytics(
          { ...t2t, sellAmount: '1000' },
          HOSKY,
          pricedBoth,
        ),
      ).toStrictEqual({
        swapValue: 'S',
        swapValueAda: 50,
        swapValueSource: 'priced',
      });
    });

    it('never takes the priced path when the trade has an ADA leg', () => {
      expect(getSwapValueAnalytics(quote({}), HOSKY, pricedBoth)).toStrictEqual(
        {
          swapValue: 'XS',
          swapValueAda: 10,
          swapValueSource: 'ada-leg',
        },
      );
    });

    it('omits every value property when the sell token is not held', () => {
      expect(getSwapValueAnalytics(t2t, undefined, pricedBoth)).toStrictEqual(
        {},
      );
    });

    it('omits every value property while the sell token metadata has not loaded', () => {
      const noMetadata = {
        blockchainName: 'Cardano',
        decimals: 0,
        tokenId: 'abc123',
      } as Token;
      expect(
        getSwapValueAnalytics(
          { ...t2t, sellAmount: '1000' },
          noMetadata,
          pricedBoth,
        ),
      ).toStrictEqual({});
    });

    it('omits every value property when the sell token is unpriced', () => {
      expect(
        getSwapValueAnalytics(t2t, HOSKY, {
          [ADA_PRICE_ID]: pricedBoth[ADA_PRICE_ID],
        }),
      ).toStrictEqual({});
    });

    it('still buckets the USD value when ADA itself is unpriced, but reports no ADA size', () => {
      expect(
        getSwapValueAnalytics({ ...t2t, sellAmount: '1000' }, HOSKY, {
          [CardanoTokenPriceId('abc123')]:
            pricedBoth[CardanoTokenPriceId('abc123')],
        }),
      ).toStrictEqual({ swapValue: 'S' });
    });

    it.each(['', '0', '-100', 'not-a-number'])(
      'omits every value property for the unusable sell amount %o',
      sellAmount => {
        expect(
          getSwapValueAnalytics({ ...t2t, sellAmount }, HOSKY, pricedBoth),
        ).toStrictEqual({});
      },
    );
  });

  describe("golden vector: parity with the other app's swap-value implementation", () => {
    // Same 11 cases as the lace-next swap-value-analytics suite, adapted to
    // this package's (quote, sellToken, prices) signature. Do not adjust an
    // expectation to make a case pass: a mismatch here is a real divergence
    // between the two implementations, not a test bug.
    const TOKEN_A = {
      blockchainName: 'Cardano',
      decimals: 2,
      metadata: { decimals: 2 },
      tokenId: 'tokenA',
    } as Token;
    const SELL_PRICE_ID = CardanoTokenPriceId('tokenA');

    const pricesFor = ({
      adaPriced,
      sellTokenPriced,
    }: {
      adaPriced: boolean;
      sellTokenPriced: boolean;
    }): Record<TokenPriceId, TokenPrice> => ({
      ...(adaPriced && {
        [ADA_PRICE_ID]: {
          priceInUsd: 0.5,
          price: 0.5,
          lastUpdated: Date.now(),
        } as TokenPrice,
      }),
      ...(sellTokenPriced && {
        [SELL_PRICE_ID]: {
          priceInUsd: 2.5,
          price: 2.5,
          lastUpdated: Date.now(),
        } as TokenPrice,
      }),
    });

    const adaBoth = pricesFor({ adaPriced: true, sellTokenPriced: false });
    const t2tQuote = quote({
      sellTokenId: 'tokenA',
      buyTokenId: 'tokenB',
      sellAmount: '1000',
      expectedBuyAmount: '500',
    });

    type GoldenCase = {
      caseNumber: number;
      name: string;
      quote: SwapQuote;
      sellToken: Token | undefined;
      prices: Record<TokenPriceId, TokenPrice>;
      expected: ReturnType<typeof getSwapValueAnalytics>;
    };

    const GOLDEN_CASES: GoldenCase[] = [
      {
        caseNumber: 1,
        name: 'ADA sell leg, priced',
        quote: quote({
          sellTokenId: LOVELACE_TOKEN_ID,
          sellAmount: '600000000',
          buyTokenId: 'other',
          expectedBuyAmount: '500',
        }),
        sellToken: undefined,
        prices: adaBoth,
        expected: {
          swapValue: 'M',
          swapValueAda: 600,
          swapValueSource: 'ada-leg',
        },
      },
      {
        caseNumber: 2,
        name: 'ADA buy leg, priced',
        quote: quote({
          sellTokenId: 'other',
          sellAmount: '1000',
          buyTokenId: LOVELACE_TOKEN_ID,
          expectedBuyAmount: '40000000',
        }),
        sellToken: undefined,
        prices: adaBoth,
        expected: {
          swapValue: 'S',
          swapValueAda: 40,
          swapValueSource: 'ada-leg',
        },
      },
      {
        caseNumber: 3,
        name: 'ADA leg, ADA unpriced',
        quote: quote({
          sellTokenId: LOVELACE_TOKEN_ID,
          sellAmount: '600000000',
          buyTokenId: 'other',
          expectedBuyAmount: '500',
        }),
        sellToken: undefined,
        prices: NO_PRICES,
        expected: {
          swapValue: 'UNKNOWN',
          swapValueAda: 600,
          swapValueSource: 'ada-leg',
        },
      },
      {
        caseNumber: 4,
        name: 'ADA leg, amount throws',
        quote: quote({
          sellTokenId: LOVELACE_TOKEN_ID,
          sellAmount: 'not-a-number',
          buyTokenId: 'other',
          expectedBuyAmount: '500',
        }),
        sellToken: undefined,
        prices: adaBoth,
        expected: { swapValue: 'UNKNOWN' },
      },
      {
        caseNumber: 5,
        name: 'ADA leg, amount non-positive',
        quote: quote({
          sellTokenId: LOVELACE_TOKEN_ID,
          sellAmount: '0',
          buyTokenId: 'other',
          expectedBuyAmount: '500',
        }),
        sellToken: undefined,
        prices: adaBoth,
        expected: { swapValue: 'UNKNOWN' },
      },
      {
        caseNumber: 6,
        name: 'ADA leg at a bucket boundary',
        quote: quote({
          sellTokenId: LOVELACE_TOKEN_ID,
          sellAmount: '20000000',
          buyTokenId: 'other',
          expectedBuyAmount: '500',
        }),
        sellToken: undefined,
        prices: adaBoth,
        expected: {
          swapValue: 'S',
          swapValueAda: 20,
          swapValueSource: 'ada-leg',
        },
      },
      {
        caseNumber: 7,
        name: 'ADA leg, whale',
        quote: quote({
          sellTokenId: LOVELACE_TOKEN_ID,
          sellAmount: '200000000000',
          buyTokenId: 'other',
          expectedBuyAmount: '500',
        }),
        sellToken: undefined,
        prices: adaBoth,
        expected: {
          swapValue: 'WHALE',
          swapValueAda: 200_000,
          swapValueSource: 'ada-leg',
        },
      },
      {
        caseNumber: 8,
        name: 'Token-to-token, fully priced',
        quote: t2tQuote,
        sellToken: TOKEN_A,
        prices: pricesFor({ adaPriced: true, sellTokenPriced: true }),
        expected: {
          swapValue: 'S',
          swapValueAda: 50,
          swapValueSource: 'priced',
        },
      },
      {
        caseNumber: 9,
        name: 'Token-to-token, ADA unpriced',
        quote: t2tQuote,
        sellToken: TOKEN_A,
        prices: pricesFor({ adaPriced: false, sellTokenPriced: true }),
        expected: { swapValue: 'S' },
      },
      {
        caseNumber: 10,
        name: 'Token-to-token, sell token unpriced',
        quote: t2tQuote,
        sellToken: TOKEN_A,
        prices: pricesFor({ adaPriced: true, sellTokenPriced: false }),
        expected: {},
      },
      {
        caseNumber: 11,
        name: 'Token-to-token, unreadable sellAmount',
        quote: { ...t2tQuote, sellAmount: 'not-a-number' },
        sellToken: TOKEN_A,
        prices: pricesFor({ adaPriced: true, sellTokenPriced: true }),
        expected: {},
      },
    ];

    it.each(GOLDEN_CASES)(
      'case $caseNumber: $name',
      ({ quote: testQuote, sellToken, prices, expected }) => {
        expect(
          getSwapValueAnalytics(testQuote, sellToken, prices),
        ).toStrictEqual(expected);
      },
    );
  });
});
