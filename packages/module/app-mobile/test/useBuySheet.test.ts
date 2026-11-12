/** @vitest-environment jsdom */
import { FeatureIds } from '@lace-contract/network';
import { openUrl } from '@lace-lib/ui-toolkit';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLaceSelector } from '../src/hooks';
import { useBuySheet } from '../src/pages/BuySheet/useBuySheet';

vi.mock('@lace-contract/app', () => ({
  useUICustomisation: () => [undefined],
}));
vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@lace-lib/ui-toolkit', () => ({ openUrl: vi.fn() }));
vi.mock('@lace-lib/util-render', () => ({ formatAmountToLocale: vi.fn() }));
vi.mock('../src/hooks', () => ({ useLaceSelector: vi.fn() }));

const current = { buyAvailable: true };
const emptyAccounts: never[] = [];
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('EXPO_PUBLIC_BANXA_URL', 'https://banxa.test/');
  current.buyAvailable = true;
  vi.mocked(useLaceSelector).mockImplementation(
    (key: string, featureId?: unknown) => {
      if (
        key === 'network.selectIsFeatureAvailable' &&
        featureId === FeatureIds.BUY_FLOW
      )
        return current.buyAvailable;
      return emptyAccounts;
    },
  );
});
afterEach(() => vi.unstubAllEnvs());

describe('legacy Banxa redirect', () => {
  it('opens Banxa when BUY_FLOW is available', () => {
    const { result } = renderHook(() => useBuySheet());
    act(() => {
      result.current.handleOpenBanxaUrl();
    });
    expect(openUrl).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://banxa.test/' }),
    );
  });

  it('blocks direct access when BUY_FLOW is unavailable', () => {
    current.buyAvailable = false;
    const { result } = renderHook(() => useBuySheet());
    act(() => {
      result.current.handleOpenBanxaUrl();
    });
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('blocks an open sheet after a remote flag removal', () => {
    const { result, rerender } = renderHook(() => useBuySheet());
    current.buyAvailable = false;
    rerender();
    expect(result.current.isBuyAvailable).toBe(false);
    act(() => {
      result.current.handleOpenBanxaUrl();
    });
    expect(openUrl).not.toHaveBeenCalled();
  });
});
