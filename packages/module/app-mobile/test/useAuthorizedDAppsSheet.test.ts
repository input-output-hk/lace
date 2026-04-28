/**
 * @vitest-environment jsdom
 */

import { dappConnectorActions, DappId } from '@lace-contract/dapp-connector';
import { FeatureIds } from '@lace-contract/network';
import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
  type SheetRoutes,
  type SheetScreenProps,
} from '@lace-lib/navigation';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../src/hooks';
import { useAuthorizedDAppsSheet } from '../src/pages/AuthorizedDAppsSheet/useAuthorizedDAppsSheet';

import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';

vi.mock('../src/hooks', () => ({
  useLaceSelector: vi.fn(),
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: { close: vi.fn() },
    actions: { closeAndNavigate: vi.fn() },
  },
  StackRoutes: { Home: 'Home' },
  TabRoutes: { DApps: 'DApps' },
}));

describe('useAuthorizedDAppsSheet', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const props = {} as SheetScreenProps<SheetRoutes.AuthorizedDApps>;

  const dappA = {
    id: DappId('https://dapp-a.example'),
    name: 'Dapp A',
    origin: 'https://dapp-a.example',
    imageUrl: 'https://dapp-a.example/icon.png',
  };

  const dappB = {
    id: DappId('https://dapp-b.example'),
    name: 'Dapp B',
    origin: 'https://dapp-b.example',
    imageUrl: 'https://dapp-b.example/icon.png',
  };

  const cardanoEntries = [
    {
      blockchain: 'Cardano' as const,
      dapp: dappA,
      isPersisted: true,
    },
  ];

  const authorizedCardanoOnly: AuthorizedDappsDataSlice = {
    Cardano: cardanoEntries,
  };

  const authorizedTwoChains: AuthorizedDappsDataSlice = {
    Cardano: cardanoEntries,
    Midnight: [
      {
        blockchain: 'Midnight',
        dapp: dappB,
        isPersisted: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSelectors = (
    authorized: AuthorizedDappsDataSlice,
    dappExplorerAvailable: boolean,
  ) => {
    mockUseLaceSelector.mockImplementation(
      (key: string, argument?: unknown) => {
        if (key === 'dappConnector.selectAuthorizedDapps') {
          return authorized;
        }
        if (
          key === 'network.selectIsFeatureAvailable' &&
          argument === FeatureIds.DAPP_EXPLORER
        ) {
          return dappExplorerAvailable;
        }
        throw new Error(`Unexpected useLaceSelector: ${key}`);
      },
    );
  };

  it('reports empty list when no authorized dapps', () => {
    mockSelectors({}, false);

    const { result } = renderHook(() => useAuthorizedDAppsSheet(props));

    expect(result.current.dApps).toEqual([]);
  });

  it('ignores chains with empty or missing arrays when flattening', () => {
    mockSelectors(
      {
        Cardano: [],
        Bitcoin: undefined,
        Midnight: [
          {
            blockchain: 'Midnight',
            dapp: dappB,
            isPersisted: true,
          },
        ],
      },
      true,
    );

    const { result } = renderHook(() => useAuthorizedDAppsSheet(props));

    expect(result.current.dApps).toHaveLength(1);
    expect(result.current.dApps[0]?.id).toBe(`Midnight:${String(dappB.id)}`);
  });

  it('flattens authorized dapps from multiple chains into dApps', () => {
    mockSelectors(authorizedTwoChains, false);

    const { result } = renderHook(() => useAuthorizedDAppsSheet(props));

    expect(result.current.dApps).toHaveLength(2);
    expect(result.current.dApps.map(d => d.id)).toEqual([
      `Cardano:${String(dappA.id)}`,
      `Midnight:${String(dappB.id)}`,
    ]);
    expect(result.current.dApps[0]).toMatchObject({
      name: dappA.name,
      category: dappA.origin,
      icon: dappA.imageUrl,
      blockchain: 'Cardano',
    });
  });

  it('gates browse button visibility on DAPP_EXPLORER availability', () => {
    mockSelectors(authorizedCardanoOnly, false);

    const { result: off } = renderHook(() => useAuthorizedDAppsSheet(props));
    expect(off.current.isBrowseButtonVisible).toBe(false);

    mockSelectors(authorizedCardanoOnly, true);

    const { result: on } = renderHook(() => useAuthorizedDAppsSheet(props));
    expect(on.current.isBrowseButtonVisible).toBe(true);
  });

  it('dispatches removeAuthorizedDapp with blockchainName and dapp id', () => {
    mockSelectors(authorizedCardanoOnly, true);

    const { result } = renderHook(() => useAuthorizedDAppsSheet(props));

    act(() => {
      result.current.dApps[0]?.onDAppRemove();
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      dappConnectorActions.authorizedDapps.removeAuthorizedDapp({
        blockchainName: 'Cardano',
        dapp: { id: dappA.id },
      }),
    );
  });

  it('dispatches remove for the matching chain when removing from a multi-chain list', () => {
    mockSelectors(authorizedTwoChains, true);

    const { result } = renderHook(() => useAuthorizedDAppsSheet(props));

    const midnightRow = result.current.dApps.find(
      d => d.blockchain === 'Midnight',
    );
    expect(midnightRow).toBeDefined();

    act(() => {
      midnightRow?.onDAppRemove();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      dappConnectorActions.authorizedDapps.removeAuthorizedDapp({
        blockchainName: 'Midnight',
        dapp: { id: dappB.id },
      }),
    );
  });

  it('exposes i18n keys for sheet copy via translation helper', () => {
    mockSelectors(authorizedCardanoOnly, true);

    const { result } = renderHook(() => useAuthorizedDAppsSheet(props));

    expect(result.current.title).toBe('settings.wallet.authorized-dapps.title');
    expect(result.current.subtitle).toBe(
      'settings.wallet.authorized-dapps.description',
    );
    expect(result.current.emptyMessage).toBe(
      'settings.wallet.authorized-dapps.empty-state-message',
    );
    expect(result.current.closeButtonLabel).toBe(
      'settings.wallet.authorized-dapps.close-button-label',
    );
  });

  it('closes sheet when onClose runs', () => {
    mockSelectors({}, false);

    const { result } = renderHook(() => useAuthorizedDAppsSheet(props));

    act(() => {
      result.current.onClose();
    });

    expect(NavigationControls.sheets.close).toHaveBeenCalledTimes(1);
  });

  it('navigates to DApps tab when onBrowseDApps runs', () => {
    mockSelectors({}, true);

    const { result } = renderHook(() => useAuthorizedDAppsSheet(props));

    act(() => {
      result.current.onBrowseDApps();
    });

    expect(NavigationControls.actions.closeAndNavigate).toHaveBeenCalledWith(
      StackRoutes.Home,
      {
        screen: TabRoutes.DApps,
      },
    );
  });
});
