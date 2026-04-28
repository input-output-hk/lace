/**
 * @vitest-environment jsdom
 */
import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../src/hooks';
import { useAdaPrice } from '../../src/pages/useAdaPrice';

vi.mock('../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
}));

describe('useAdaPrice', () => {
  const mockUseLaceSelector = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooksModule.useLaceSelector).mockImplementation(
      mockUseLaceSelector,
    );
  });

  it('returns selected currency and ADA price in that currency', () => {
    const selectedCurrency = { name: 'USD', ticker: '$' };
    const adaPriceId = CardanoTokenPriceId('ada');
    const prices = { [adaPriceId]: { price: 0.42 } };

    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'tokenPricing.selectCurrencyPreference') {
        return selectedCurrency;
      }
      if (selector === 'tokenPricing.selectPrices') {
        return prices;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAdaPrice());

    expect(result.current.currency).toEqual(selectedCurrency);
    expect(result.current.adaPrice).toBe(0.42);
  });

  it('returns 1 price when ADA price is missing', () => {
    const selectedCurrency = { name: 'USD', ticker: '$' };
    const prices = {};

    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'tokenPricing.selectCurrencyPreference') {
        return selectedCurrency;
      }
      if (selector === 'tokenPricing.selectPrices') {
        return prices;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAdaPrice());

    expect(result.current.currency).toEqual(selectedCurrency);
    expect(result.current.adaPrice).toBe(1);
  });
});
