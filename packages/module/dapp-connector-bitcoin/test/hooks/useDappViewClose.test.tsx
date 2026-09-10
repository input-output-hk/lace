/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  selectors: {} as Record<string, unknown>,
  dispatched: [] as Array<{ key: string; args: unknown[] }>,
}));

vi.mock('../../src/hooks/storeHooks', () => ({
  useLaceSelector: (key: string) => mocks.selectors[key],
  useDispatchLaceAction:
    (key: string, ignoreArgs = false) =>
    (...args: unknown[]) => {
      mocks.dispatched.push({ key, args: ignoreArgs ? [] : args });
    },
}));

import { BITCOIN_DAPP_SIGN_TX_LOCATION } from '../../src/const';
import { useDappViewClose } from '../../src/hooks/useDappViewClose';

describe('useDappViewClose', () => {
  beforeEach(() => {
    mocks.dispatched = [];
    mocks.selectors = { 'views.getActiveSheetPage': null };
    window.close = vi.fn();
  });

  it('dismisses the sheet when one is active', () => {
    mocks.selectors = {
      'views.getActiveSheetPage': { route: 'BitcoinDappSignTx' },
    };

    const { result } = renderHook(() =>
      useDappViewClose(BITCOIN_DAPP_SIGN_TX_LOCATION),
    );
    result.current();

    expect(mocks.dispatched).toEqual([
      { key: 'views.setActiveSheetPage', args: [null] },
    ]);
    expect(window.close).not.toHaveBeenCalled();
  });

  it('asks the service worker to close the popup at the given location', () => {
    const { result } = renderHook(() =>
      useDappViewClose(BITCOIN_DAPP_SIGN_TX_LOCATION),
    );
    result.current();

    expect(mocks.dispatched).toEqual([
      {
        key: 'bitcoinDappConnector.closePopupRequested',
        args: [BITCOIN_DAPP_SIGN_TX_LOCATION],
      },
    ]);
    expect(window.close).not.toHaveBeenCalled();
  });

  it('falls back to window.close when no popup location is known', () => {
    const { result } = renderHook(() => useDappViewClose());
    result.current();

    expect(mocks.dispatched).toEqual([]);
    expect(window.close).toHaveBeenCalledTimes(1);
  });
});
