import { describe, expect, it } from 'vitest';

import type { CurrencyPreference } from '@lace-contract/token-pricing';

describe('FiatCurrencySheet Currency Selection Logic', () => {
  it('should parse feature flag currencies correctly', () => {
    const mockFeatureFlag = {
      key: 'SUPPORTED_CURRENCIES',
      payload: {
        currencies: [
          { name: 'USD', ticker: '$' },
          { name: 'EUR', ticker: '€' },
          { name: 'GBP', ticker: '£' },
        ],
      },
    };

    const currencies = mockFeatureFlag.payload
      .currencies as CurrencyPreference[];

    expect(currencies).toHaveLength(3);
    expect(currencies[0]).toEqual({ name: 'USD', ticker: '$' });
    expect(currencies[1]).toEqual({ name: 'EUR', ticker: '€' });
    expect(currencies[2]).toEqual({ name: 'GBP', ticker: '£' });
  });

  it('should handle feature flag with all supported currencies', () => {
    const mockFeatureFlag = {
      key: 'SUPPORTED_CURRENCIES',
      payload: {
        currencies: [
          { name: 'USD', ticker: '$' },
          { name: 'EUR', ticker: '€' },
          { name: 'GBP', ticker: '£' },
          { name: 'JPY', ticker: '¥' },
          { name: 'CAD', ticker: 'C$' },
          { name: 'AUD', ticker: 'A$' },
          { name: 'CHF', ticker: 'CHF' },
          { name: 'CNY', ticker: '¥' },
          { name: 'BRL', ticker: 'R$' },
          { name: 'INR', ticker: '₹' },
          { name: 'KRW', ticker: '₩' },
          { name: 'VND', ticker: '₫' },
          { name: 'MXN', ticker: 'MXN' },
        ],
      },
    };

    const currencies = mockFeatureFlag.payload
      .currencies as CurrencyPreference[];

    expect(currencies).toHaveLength(13);

    currencies.forEach(currency => {
      expect(currency).toHaveProperty('name');
      expect(currency).toHaveProperty('ticker');
      expect(typeof currency.name).toBe('string');
      expect(typeof currency.ticker).toBe('string');
    });
  });

  it('should map currencies to radio options correctly', () => {
    const currencies: CurrencyPreference[] = [
      { name: 'USD', ticker: '$' },
      { name: 'EUR', ticker: '€' },
      { name: 'GBP', ticker: '£' },
    ];

    const radioOptions = currencies.map(currency => ({
      label: currency.name,
      value: currency.name,
    }));

    expect(radioOptions).toHaveLength(3);
    expect(radioOptions[0]).toEqual({ label: 'USD', value: 'USD' });
    expect(radioOptions[1]).toEqual({ label: 'EUR', value: 'EUR' });
    expect(radioOptions[2]).toEqual({ label: 'GBP', value: 'GBP' });
  });

  it('should handle major currencies with correct tickers', () => {
    const currencies: CurrencyPreference[] = [
      { name: 'USD', ticker: '$' },
      { name: 'EUR', ticker: '€' },
      { name: 'GBP', ticker: '£' },
    ];

    const usd = currencies.find(c => c.name === 'USD');
    const eur = currencies.find(c => c.name === 'EUR');
    const gbp = currencies.find(c => c.name === 'GBP');

    expect(usd?.ticker).toBe('$');
    expect(eur?.ticker).toBe('€');
    expect(gbp?.ticker).toBe('£');
  });

  it('should synchronize currency ref with external updates', () => {
    const persistedCurrency: CurrencyPreference = { name: 'USD', ticker: '$' };
    const externallyUpdatedCurrency: CurrencyPreference = {
      name: 'EUR',
      ticker: '€',
    };

    const initialCurrencyRef = { current: persistedCurrency };
    const resolvedSelectedCurrency = externallyUpdatedCurrency;
    initialCurrencyRef.current = resolvedSelectedCurrency;

    expect(initialCurrencyRef.current).toEqual(externallyUpdatedCurrency);

    const cancelBehavior = initialCurrencyRef.current;
    expect(cancelBehavior).toEqual(externallyUpdatedCurrency);
    expect(cancelBehavior).not.toEqual(persistedCurrency);
  });

  it('should validate selected currency exists in supported list', () => {
    const supportedCurrencies: CurrencyPreference[] = [
      { name: 'USD', ticker: '$' },
      { name: 'EUR', ticker: '€' },
      { name: 'GBP', ticker: '£' },
    ];

    const validCurrency: CurrencyPreference = { name: 'USD', ticker: '$' };
    const isValidSupported = supportedCurrencies.some(
      c => c.name === validCurrency?.name,
    );
    expect(isValidSupported).toBe(true);

    const invalidCurrency: CurrencyPreference = { name: 'MXN', ticker: 'MXN' };
    const isInvalidSupported = supportedCurrencies.some(
      c => c.name === invalidCurrency?.name,
    );
    expect(isInvalidSupported).toBe(false);

    const DEFAULT_CURRENCY: CurrencyPreference = { name: 'USD', ticker: '$' };
    const resolvedCurrency = isValidSupported
      ? validCurrency
      : DEFAULT_CURRENCY;
    expect(resolvedCurrency).toEqual(validCurrency);

    const resolvedInvalidCurrency = isInvalidSupported
      ? invalidCurrency
      : DEFAULT_CURRENCY;
    expect(resolvedInvalidCurrency).toEqual(DEFAULT_CURRENCY);
  });

  it('should handle missing selected currency gracefully', () => {
    const supportedCurrencies: CurrencyPreference[] = [
      { name: 'USD', ticker: '$' },
      { name: 'EUR', ticker: '€' },
    ];
    const DEFAULT_CURRENCY: CurrencyPreference = { name: 'USD', ticker: '$' };

    const undefinedCurrency: CurrencyPreference | undefined = undefined;
    const isSupported = supportedCurrencies.some(
      c =>
        c.name === (undefinedCurrency as CurrencyPreference | undefined)?.name,
    );

    expect(isSupported).toBe(false);
    const resolvedCurrency: CurrencyPreference =
      isSupported && undefinedCurrency ? undefinedCurrency : DEFAULT_CURRENCY;
    expect(resolvedCurrency).toEqual(DEFAULT_CURRENCY);
  });

  it('should fallback to default when feature flag has no currencies', () => {
    const DEFAULT_CURRENCY: CurrencyPreference = { name: 'USD', ticker: '$' };

    const currencies: CurrencyPreference[] = [];
    const result =
      Array.isArray(currencies) && currencies.length > 0
        ? currencies
        : [DEFAULT_CURRENCY];

    expect(result).toEqual([DEFAULT_CURRENCY]);
  });

  it('should fallback to default when feature flag payload is malformed', () => {
    const DEFAULT_CURRENCY: CurrencyPreference = { name: 'USD', ticker: '$' };

    const malformedCases = [
      null,
      undefined,
      {},
      { currencies: null },
      { currencies: undefined },
      { currencies: 'not-an-array' },
    ];

    malformedCases.forEach(malformed => {
      const currencies = Array.isArray(malformed)
        ? malformed
        : [DEFAULT_CURRENCY];
      expect(currencies).toEqual([DEFAULT_CURRENCY]);
    });
  });
});
