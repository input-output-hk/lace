/**
 * @vitest-environment jsdom
 */

import { NavigationControls } from '@lace-lib/navigation';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lace-lib/ui-toolkit', () => ({
  ORDERS: {
    ASC: 'asc',
    DESC: 'desc',
  },
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn() },
}));

const mockDispatch = vi.fn();

// `useDispatchLaceAction` memoizes on the store dispatch, so a component keeps
// the same reference across renders; mirror that, or handlers built on it would
// look unstable here for a reason production never has.
const dispatchers = new Map<string, (argument: unknown) => void>();

vi.mock('../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn((key: string) => {
    const existing = dispatchers.get(key);
    if (existing) return existing;

    const dispatcher = (argument: unknown) => {
      mockDispatch(key, argument);
    };
    dispatchers.set(key, dispatcher);
    return dispatcher;
  }),
}));

import * as hooksModule from '../../src/hooks';
import { usePortfolioTokenSortSheet } from '../../src/pages/portfolio/usePortfolioTokenSortSheet';

import type { TokenSortPreference } from '../../src/pages/portfolio/utils/portfolioSort';

describe('usePortfolioTokenSortSheet', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);

  const renderSheet = ({
    persisted = { order: 'asc' } as TokenSortPreference,
    isTokenPricingEnabled = true,
  } = {}) => {
    let stored = persisted;
    mockUseLaceSelector.mockImplementation((key: string) => {
      if (key === 'ui.getTokenSort') return stored;
      throw new Error(`Unexpected useLaceSelector: ${key}`);
    });

    const rendered = renderHook(() =>
      usePortfolioTokenSortSheet(isTokenPricingEnabled),
    );

    return {
      ...rendered,
      storePreference: (next: TokenSortPreference) => {
        stored = next;
        rendered.rerender();
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds the draft from the stored preference', () => {
    const { result } = renderSheet({
      persisted: { option: 'ticker', order: 'desc' },
    });

    expect(result.current.localOption).toBe('ticker');
    expect(result.current.localOrder).toBe('desc');
  });

  it('stores the applied preference so it outlives the sheet', () => {
    const { result } = renderSheet();

    act(() => {
      result.current.handleSelectOption(
        result.current.tokenSortOptions.indexOf('ticker'),
      );
    });
    act(() => {
      result.current.handleConfirm();
    });

    expect(mockDispatch).toHaveBeenCalledWith('ui.setTokenSort', {
      option: 'ticker',
      order: 'asc',
    });
    expect(NavigationControls.closeSheet).toHaveBeenCalled();
  });

  // Models the sheet footer holding the handler from an earlier publish.
  it('commits the latest draft through a confirm handler captured earlier', () => {
    const { result } = renderSheet();
    const confirmFromFirstPublish = result.current.handleConfirm;

    act(() => {
      result.current.handleSelectOption(
        result.current.tokenSortOptions.indexOf('ticker'),
      );
    });
    act(() => {
      confirmFromFirstPublish();
    });

    expect(result.current.handleConfirm).toBe(confirmFromFirstPublish);
    expect(mockDispatch).toHaveBeenCalledWith('ui.setTokenSort', {
      option: 'ticker',
      order: 'asc',
    });
  });

  it('stores the cleared preference when the user clears the sort', () => {
    const { result } = renderSheet({
      persisted: { option: 'ticker', order: 'desc' },
    });

    act(() => {
      result.current.handleClearAndApply();
    });

    expect(mockDispatch).toHaveBeenCalledWith('ui.setTokenSort', {
      option: undefined,
      order: 'asc',
    });
  });

  it('applies the order the user toggled', () => {
    const { result } = renderSheet({
      persisted: { option: 'ticker', order: 'asc' },
    });

    act(() => {
      result.current.handleToggleOrder();
    });
    act(() => {
      result.current.handleConfirm();
    });

    expect(mockDispatch).toHaveBeenCalledWith('ui.setTokenSort', {
      option: 'ticker',
      order: 'desc',
    });
  });

  it('leaves the stored preference alone when the draft was never touched', () => {
    const { result } = renderSheet({
      persisted: { option: 'ticker', order: 'desc' },
    });

    act(() => {
      result.current.handleConfirm();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(NavigationControls.closeSheet).toHaveBeenCalled();

    act(() => {
      result.current.handleSelectOption(
        result.current.tokenSortOptions.indexOf('quantity'),
      );
    });
    act(() => {
      result.current.handleConfirm();
    });

    expect(mockDispatch).toHaveBeenCalledWith('ui.setTokenSort', {
      option: 'quantity',
      order: 'desc',
    });
  });

  it('leaves the stored preference alone when the draft returns to the seed', () => {
    const { result } = renderSheet({
      persisted: { option: 'ticker', order: 'asc' },
    });

    act(() => {
      result.current.handleSelectOption(
        result.current.tokenSortOptions.indexOf('quantity'),
      );
    });
    act(() => {
      result.current.handleSelectOption(
        result.current.tokenSortOptions.indexOf('ticker'),
      );
    });
    act(() => {
      result.current.handleConfirm();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(NavigationControls.closeSheet).toHaveBeenCalled();
  });

  it('stores the sort cleared through the dropdown', () => {
    const { result } = renderSheet({
      persisted: { option: 'ticker', order: 'desc' },
    });

    act(() => {
      result.current.handleClear();
    });
    act(() => {
      result.current.handleConfirm();
    });

    expect(mockDispatch).toHaveBeenCalledWith('ui.setTokenSort', {
      option: undefined,
      order: 'asc',
    });
  });

  it('discards a draft the user abandoned when a new preference arrives', () => {
    const { result, storePreference } = renderSheet({
      persisted: { option: 'ticker', order: 'asc' },
    });

    act(() => {
      result.current.handleSelectOption(
        result.current.tokenSortOptions.indexOf('quantity'),
      );
    });
    act(() => {
      storePreference({ option: 'value', order: 'asc' });
    });

    expect(result.current.localOption).toBe('value');
    expect(result.current.localOrder).toBe('asc');

    act(() => {
      result.current.handleConfirm();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  describe('without token pricing', () => {
    it('offers every option but value', () => {
      const { result } = renderSheet({ isTokenPricingEnabled: false });

      expect(result.current.tokenSortOptions).toEqual(['quantity', 'ticker']);
    });

    it('ignores a value preference stored while pricing was available', () => {
      const { result } = renderSheet({
        persisted: { option: 'value', order: 'desc' },
        isTokenPricingEnabled: false,
      });

      expect(result.current.localOption).toBeUndefined();
      expect(result.current.localOrder).toBe('asc');
    });

    it('keeps a narrowed value preference when the draft was never touched', () => {
      const { result } = renderSheet({
        persisted: { option: 'value', order: 'desc' },
        isTokenPricingEnabled: false,
      });

      act(() => {
        result.current.handleConfirm();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(NavigationControls.closeSheet).toHaveBeenCalled();
    });

    it('keeps a narrowed value preference when the user clears an empty sort', () => {
      const { result } = renderSheet({
        persisted: { option: 'value', order: 'desc' },
        isTokenPricingEnabled: false,
      });

      act(() => {
        result.current.handleClearAndApply();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(NavigationControls.closeSheet).toHaveBeenCalled();
    });

    // 'ticker' defaults to ascending, so the payload cannot be satisfied by the
    // descending order left behind by the narrowed-away 'value' preference.
    it('overwrites a narrowed value preference once the user picks an option', () => {
      const { result } = renderSheet({
        persisted: { option: 'value', order: 'desc' },
        isTokenPricingEnabled: false,
      });

      act(() => {
        result.current.handleSelectOption(
          result.current.tokenSortOptions.indexOf('ticker'),
        );
      });
      act(() => {
        result.current.handleConfirm();
      });

      expect(mockDispatch).toHaveBeenCalledWith('ui.setTokenSort', {
        option: 'ticker',
        order: 'asc',
      });
    });
  });
});
