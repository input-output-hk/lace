import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { describe, expect, it } from 'vitest';

import {
  adaPriceInCurrencyFrom,
  convertFeeToAdaAndFiat,
  priceInCurrencyFrom,
  serviceFeePriceInCurrency,
} from '../src/fee-display';

describe('serviceFeePriceInCurrency', () => {
  const base = {
    lovelaceTokenId: 'lovelace',
    usdrTokenId: 'usdr-token',
    usdToCurrencyRate: 0.92,
  };

  it('returns undefined for an ADA (lovelace) or absent service fee token', () => {
    expect(
      serviceFeePriceInCurrency({
        ...base,
        serviceFeeTokenId: 'lovelace',
        feedPriceInCurrency: undefined,
      }),
    ).toBeUndefined();
    expect(
      serviceFeePriceInCurrency({
        ...base,
        serviceFeeTokenId: undefined,
        feedPriceInCurrency: undefined,
      }),
    ).toBeUndefined();
  });

  it('prices USDr at the USD→currency peg', () => {
    expect(
      serviceFeePriceInCurrency({
        ...base,
        serviceFeeTokenId: 'usdr-token',
        feedPriceInCurrency: undefined,
      }),
    ).toBe(0.92);
  });

  it('prices a counterpart stablecoin (USDCx) at the peg when the feed has no entry — the dashed-fee bug', () => {
    expect(
      serviceFeePriceInCurrency({
        ...base,
        serviceFeeTokenId: 'usdcx-token',
        feedPriceInCurrency: undefined,
      }),
    ).toBe(0.92);
  });

  it('prefers a listed feed price over the peg for a counterpart stablecoin', () => {
    expect(
      serviceFeePriceInCurrency({
        ...base,
        serviceFeeTokenId: 'usdcx-token',
        feedPriceInCurrency: 0.999,
      }),
    ).toBe(0.999);
  });
});

describe('priceInCurrencyFrom', () => {
  const PRICE_ID = CardanoTokenPriceId('lovelace');

  it('returns the positive price for the entry, like the send flow fee rows', () => {
    expect(priceInCurrencyFrom({ [PRICE_ID]: { price: 0.5 } }, PRICE_ID)).toBe(
      0.5,
    );
  });

  it('returns undefined for a missing map, missing id, missing entry, or non-positive price', () => {
    expect(priceInCurrencyFrom(undefined, PRICE_ID)).toBeUndefined();
    expect(
      priceInCurrencyFrom({ [PRICE_ID]: { price: 0.5 } }, null),
    ).toBeUndefined();
    expect(priceInCurrencyFrom({}, PRICE_ID)).toBeUndefined();
    expect(
      priceInCurrencyFrom({ [PRICE_ID]: { price: 0 } }, PRICE_ID),
    ).toBeUndefined();
  });
});

describe('adaPriceInCurrencyFrom', () => {
  it('reads the fixed lovelace price entry', () => {
    expect(
      adaPriceInCurrencyFrom({
        [CardanoTokenPriceId('lovelace')]: { price: 0.42 },
      }),
    ).toBe(0.42);
    expect(adaPriceInCurrencyFrom(undefined)).toBeUndefined();
  });
});

describe('convertFeeToAdaAndFiat', () => {
  it('passes a lovelace fee straight through, pricing fiat at the ADA rate', () => {
    expect(
      convertFeeToAdaAndFiat(
        { baseUnits: '185000', isLovelace: true, decimals: 6 },
        { adaPriceInCurrency: 0.5, feeTokenPriceInCurrency: undefined },
      ),
    ).toEqual({ units: 0.185, ada: 0.185, fiat: 0.0925 });
  });

  it('converts a token-denominated fee via its price, then into ADA', () => {
    // 0.30 USDr at $1, ADA at $0.50 → $0.30 → 0.6 ADA.
    expect(
      convertFeeToAdaAndFiat(
        { baseUnits: '300000', isLovelace: false, decimals: 6 },
        { adaPriceInCurrency: 0.5, feeTokenPriceInCurrency: 1 },
      ),
    ).toEqual({ units: 0.3, ada: 0.6, fiat: 0.3 });
  });

  it('returns undefined parts instead of fabricating a rate', () => {
    // Unpriced fee token → neither fiat nor ADA.
    expect(
      convertFeeToAdaAndFiat(
        { baseUnits: '300000', isLovelace: false, decimals: 6 },
        { adaPriceInCurrency: 0.5, feeTokenPriceInCurrency: undefined },
      ),
    ).toEqual({ units: 0.3, ada: undefined, fiat: undefined });
    // Priced fee token but unpriced ADA → fiat only.
    expect(
      convertFeeToAdaAndFiat(
        { baseUnits: '300000', isLovelace: false, decimals: 6 },
        { adaPriceInCurrency: undefined, feeTokenPriceInCurrency: 1 },
      ),
    ).toEqual({ units: 0.3, ada: undefined, fiat: 0.3 });
    // Lovelace fee with unpriced ADA → ADA only.
    expect(
      convertFeeToAdaAndFiat(
        { baseUnits: '185000', isLovelace: true, decimals: 6 },
        { adaPriceInCurrency: undefined, feeTokenPriceInCurrency: undefined },
      ),
    ).toEqual({ units: 0.185, ada: 0.185, fiat: undefined });
  });
});
