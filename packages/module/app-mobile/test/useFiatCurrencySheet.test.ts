/**
 * @vitest-environment jsdom
 */

import { NavigationControls } from '@lace-lib/navigation';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../src/hooks';
import { useFiatCurrencySheet } from '../src/pages/FiatCurrencySheet/useFiatCurrencySheet';

import type { CurrencyPreference } from '@lace-contract/token-pricing';

const mockDispatch = vi.fn();

vi.mock('../src/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn((key: string) => (argument: unknown) => {
    mockDispatch(key, argument);
  }),
}));

// `t` echoes the key, except it resolves USD's full-name key so we can assert
// that a description is attached only when a translation exists.
vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'v2.sheets.fiatCurrency.currencyFullName.USD' ? 'US Dollar' : key,
  }),
}));

vi.mock('@lace-contract/analytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn() },
}));

const USD: CurrencyPreference = { name: 'USD', ticker: '$' };
const EUR: CurrencyPreference = { name: 'EUR', ticker: '€' };
const GBP: CurrencyPreference = { name: 'GBP', ticker: '£' };

describe('useFiatCurrencySheet', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);

  const mockSelectors = ({
    preference,
    supported,
  }: {
    preference: CurrencyPreference | undefined;
    supported: CurrencyPreference[];
  }) => {
    mockUseLaceSelector.mockImplementation((key: string) => {
      if (key === 'tokenPricing.selectCurrencyPreference') return preference;
      if (key === 'tokenPricing.selectSupportedCurrencyPreferences') {
        return supported;
      }
      throw new Error(`Unexpected useLaceSelector: ${key}`);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps the supported currencies to radio options with translated descriptions', () => {
    mockSelectors({ preference: USD, supported: [USD, EUR, GBP] });
    const { result } = renderHook(() => useFiatCurrencySheet());

    expect(result.current.radioOptions).toEqual([
      { label: 'USD', value: 'USD', description: 'US Dollar' },
      { label: 'EUR', value: 'EUR', description: undefined },
      { label: 'GBP', value: 'GBP', description: undefined },
    ]);
  });

  it('uses the persisted currency when it is still selectable', () => {
    mockSelectors({ preference: EUR, supported: [USD, EUR, GBP] });
    const { result } = renderHook(() => useFiatCurrencySheet());
    expect(result.current.value).toBe('EUR');
  });

  it('falls back to the default when the persisted currency is not selectable', () => {
    mockSelectors({
      preference: { name: 'JPY', ticker: '¥' },
      supported: [USD, EUR],
    });
    const { result } = renderHook(() => useFiatCurrencySheet());
    expect(result.current.value).toBe('USD');
  });

  it('updates the temporary selection on change', () => {
    mockSelectors({ preference: USD, supported: [USD, EUR, GBP] });
    const { result } = renderHook(() => useFiatCurrencySheet());

    act(() => {
      result.current.onChange('EUR');
    });

    expect(result.current.value).toBe('EUR');
  });

  it('dispatches the new currency and closes the sheet on confirm', () => {
    mockSelectors({ preference: USD, supported: [USD, EUR, GBP] });
    const { result } = renderHook(() => useFiatCurrencySheet());

    act(() => {
      result.current.onChange('EUR');
    });
    act(() => {
      result.current.onConfirm();
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.calls[0]).toEqual([
      'tokenPricing.setCurrencyPreference',
      EUR,
    ]);
    expect(NavigationControls.closeSheet).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch on confirm when the selection is unchanged', () => {
    mockSelectors({ preference: USD, supported: [USD, EUR, GBP] });
    const { result } = renderHook(() => useFiatCurrencySheet());

    act(() => {
      result.current.onConfirm();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(NavigationControls.closeSheet).toHaveBeenCalledTimes(1);
  });

  it('reverts the temporary selection and does not dispatch on cancel', () => {
    mockSelectors({ preference: USD, supported: [USD, EUR, GBP] });
    const { result } = renderHook(() => useFiatCurrencySheet());

    act(() => {
      result.current.onChange('EUR');
    });
    expect(result.current.value).toBe('EUR');

    act(() => {
      result.current.onClose();
    });

    expect(result.current.value).toBe('USD');
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(NavigationControls.closeSheet).toHaveBeenCalledTimes(1);
  });

  it('resets the temporary selection when a currency becomes unsupported mid-session', () => {
    mockSelectors({ preference: EUR, supported: [USD, EUR, GBP] });
    const { result, rerender } = renderHook(() => useFiatCurrencySheet());
    expect(result.current.value).toBe('EUR');

    mockSelectors({ preference: EUR, supported: [USD, GBP] });
    rerender();

    expect(result.current.value).toBe('USD');
  });

  it('resolves to the first supported currency when the persisted one is gone and USD is absent', () => {
    mockSelectors({
      preference: { name: 'JPY', ticker: '¥' },
      supported: [EUR, GBP],
    });
    const { result } = renderHook(() => useFiatCurrencySheet());
    expect(result.current.value).toBe('EUR');
  });

  it('resolves to the default when the supported list is empty', () => {
    mockSelectors({ preference: { name: 'JPY', ticker: '¥' }, supported: [] });
    const { result } = renderHook(() => useFiatCurrencySheet());
    expect(result.current.value).toBe('USD');
  });
});
