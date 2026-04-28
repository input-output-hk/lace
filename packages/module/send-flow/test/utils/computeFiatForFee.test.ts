import { describe, expect, it, vi } from 'vitest';

import {
  computeFiatForFee,
  type ComputeFiatForFeeParams,
} from '../../src/utils/computeFiatForFee';

vi.mock('@lace-lib/util-render', () => ({
  valueToLocale: (value: string, _min: number, _max: number) =>
    Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
}));

describe('computeFiatForFee', () => {
  const bitcoinPriceId = 'bitcoin:btc';
  const cardanoPriceId = 'cardano:ada';

  const baseParams: ComputeFiatForFeeParams = {
    rawAmount: '1000',
    chainName: 'Bitcoin',
    allPrices: { [bitcoinPriceId]: { price: 50_000 } },
    currencyPreference: { name: 'USD' },
  };

  describe('when allPrices or currencyPreference is missing', () => {
    it('returns empty fiat when allPrices is undefined', () => {
      const result = computeFiatForFee({
        ...baseParams,
        allPrices: undefined,
      });
      expect(result).toEqual({ value: '', currency: '' });
    });

    it('returns empty fiat when currencyPreference is undefined', () => {
      const result = computeFiatForFee({
        ...baseParams,
        currencyPreference: undefined,
      });
      expect(result).toEqual({ value: '', currency: '' });
    });
  });

  describe('when chainName is unsupported', () => {
    it('returns empty fiat when chainName is null', () => {
      const result = computeFiatForFee({
        ...baseParams,
        chainName: null,
      });
      expect(result).toEqual({ value: '', currency: '' });
    });

    it('returns empty fiat when chainName is not Bitcoin or Cardano', () => {
      const result = computeFiatForFee({
        ...baseParams,
        chainName: 'Midnight',
      });
      expect(result).toEqual({ value: '', currency: '' });
    });
  });

  describe('Bitcoin (satoshis → BTC)', () => {
    it('converts satoshis to BTC and multiplies by price', () => {
      const result = computeFiatForFee({
        rawAmount: '100000000',
        chainName: 'Bitcoin',
        allPrices: { [bitcoinPriceId]: { price: 50_000 } },
        currencyPreference: { name: 'USD' },
      });
      expect(result.currency).toBe('USD');
      expect(result.value).toBe('50,000.00');
    });

    it('returns empty fiat when Bitcoin price is missing from allPrices', () => {
      const result = computeFiatForFee({
        ...baseParams,
        allPrices: {},
      });
      expect(result).toEqual({ value: '', currency: '' });
    });

    it('returns empty fiat when Bitcoin price is zero', () => {
      const result = computeFiatForFee({
        ...baseParams,
        allPrices: { [bitcoinPriceId]: { price: 0 } },
      });
      expect(result).toEqual({ value: '', currency: '' });
    });

    it('handles fractional satoshis correctly', () => {
      const result = computeFiatForFee({
        rawAmount: '50000000',
        chainName: 'Bitcoin',
        allPrices: { [bitcoinPriceId]: { price: 100_000 } },
        currencyPreference: { name: 'EUR' },
      });
      expect(result.currency).toBe('EUR');
      expect(result.value).toBe('50,000.00');
    });
  });

  describe('Cardano (lovelace → ADA)', () => {
    it('converts lovelace to ADA and multiplies by price', () => {
      const result = computeFiatForFee({
        rawAmount: '1000000',
        chainName: 'Cardano',
        allPrices: { [cardanoPriceId]: { price: 0.5 } },
        currencyPreference: { name: 'USD' },
      });
      expect(result.currency).toBe('USD');
      expect(result.value).toBe('0.50');
    });

    it('returns empty fiat when Cardano price is missing from allPrices', () => {
      const result = computeFiatForFee({
        ...baseParams,
        chainName: 'Cardano',
        allPrices: {},
      });
      expect(result).toEqual({ value: '', currency: '' });
    });

    it('returns empty fiat when priceData exists but price is missing', () => {
      const result = computeFiatForFee({
        ...baseParams,
        chainName: 'Cardano',
        allPrices: { [cardanoPriceId]: {} as { price: number } },
      });
      expect(result).toEqual({ value: '', currency: '' });
    });

    it('handles large lovelace amounts', () => {
      const result = computeFiatForFee({
        rawAmount: '10000000000',
        chainName: 'Cardano',
        allPrices: { [cardanoPriceId]: { price: 0.6 } },
        currencyPreference: { name: 'GBP' },
      });
      expect(result.currency).toBe('GBP');
      expect(result.value).toBe('6,000.00');
    });
  });

  describe('precision', () => {
    it('uses valueToLocale with 2 fraction digits for Bitcoin', () => {
      const result = computeFiatForFee({
        rawAmount: '1234567',
        chainName: 'Bitcoin',
        allPrices: { [bitcoinPriceId]: { price: 1 } },
        currencyPreference: { name: 'USD' },
      });
      expect(result.value).toMatch(/^\d{1,3}(,\d{3})*\.\d{2}$/);
    });

    it('uses valueToLocale with 2 fraction digits for Cardano', () => {
      const result = computeFiatForFee({
        rawAmount: '123456789',
        chainName: 'Cardano',
        allPrices: { [cardanoPriceId]: { price: 1 } },
        currencyPreference: { name: 'USD' },
      });
      expect(result.value).toMatch(/^\d{1,3}(,\d{3})*\.\d{2}$/);
    });
  });
});
