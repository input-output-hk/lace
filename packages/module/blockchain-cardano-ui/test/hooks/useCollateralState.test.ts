/**
 * @vitest-environment jsdom
 */
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls } from '@lace-lib/navigation';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: {
      close: vi.fn(),
    },
  },
}));

vi.mock('../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(),
}));

vi.mock('@lace-contract/i18n', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

import * as hooksModule from '../../src/hooks';
import { useCollateralState } from '../../src/hooks/useCollateralState';

const mockSheetsClose = vi.mocked(NavigationControls.sheets.close);

vi.mock('@lace-lib/ui-toolkit', () => ({
  useTheme: () => ({ theme: { brand: { white: '#fff' } } }),
}));

const accountIdA = 'account-id-a';
const accountIdB = 'account-id-b';
const walletId = 'wallet-id';

/** Default return values for selectors not under test. */
const defaultSelectorValue = (selector: string): unknown => {
  if (selector === 'network.selectNetworkType') return 'mainnet';
  if (selector === 'features.selectLoadedFeatures') return { featureFlags: [] };
  if (selector === 'tokenPricing.selectCurrencyPreference')
    return { name: 'US Dollar', ticker: 'USD' };
  if (selector === 'tokenPricing.selectPrices') return {};
  return undefined;
};

const createMockWallet = (accountId: string) => ({
  accounts: [
    {
      accountId: AccountId(accountId),
      blockchainName: 'Cardano' as const,
    },
  ],
});

describe('useCollateralState', () => {
  const mockDispatchClosed = vi.fn();
  const mockDispatchBuildRequested = vi.fn();
  const mockDispatchConfirmed = vi.fn();
  const mockDispatchReclaimRequested = vi.fn();
  const mockShowToast = vi.fn();

  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const mockUseDispatchLaceAction = vi.mocked(
    hooksModule.useDispatchLaceAction,
  );

  beforeEach(() => {
    vi.clearAllMocks();

    type DispatchLaceActionReturn = ReturnType<
      typeof hooksModule.useDispatchLaceAction
    >;
    mockUseDispatchLaceAction.mockImplementation((actionName: string) => {
      let dispatchFunction: DispatchLaceActionReturn;
      if (actionName === 'collateralFlow.closed') {
        dispatchFunction =
          mockDispatchClosed as unknown as DispatchLaceActionReturn;
      } else if (actionName === 'collateralFlow.buildRequested') {
        dispatchFunction =
          mockDispatchBuildRequested as unknown as DispatchLaceActionReturn;
      } else if (actionName === 'collateralFlow.confirmed') {
        dispatchFunction =
          mockDispatchConfirmed as unknown as DispatchLaceActionReturn;
      } else if (actionName === 'collateralFlow.reclaimRequested') {
        dispatchFunction =
          mockDispatchReclaimRequested as unknown as DispatchLaceActionReturn;
      } else if (actionName === 'ui.showToast') {
        dispatchFunction = mockShowToast as unknown as DispatchLaceActionReturn;
      } else {
        dispatchFunction = vi.fn() as unknown as DispatchLaceActionReturn;
      }
      return dispatchFunction;
    });

    mockUseLaceSelector.mockImplementation(
      (selector: string, ..._args: unknown[]) => {
        if (selector === 'collateralFlow.selectState') {
          return { status: 'Idle' };
        }
        if (selector === 'wallets.selectWalletById') {
          return createMockWallet(accountIdA);
        }
        return defaultSelectorValue(selector);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cleanup on unmount', () => {
    it('dispatches closed when component unmounts with non-Idle status', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Ready', accountId: accountIdA };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { unmount } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      unmount();

      expect(mockDispatchClosed).toHaveBeenCalled();
    });
  });

  describe('initialization effect', () => {
    it('dispatches buildRequested when Idle and account and wallet are available', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Idle' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      renderHook(() => useCollateralState({ accountId: accountIdA, walletId }));

      expect(mockDispatchBuildRequested).toHaveBeenCalledWith({
        accountId: AccountId(accountIdA),
        wallet: createMockWallet(accountIdA),
      });
    });

    it('does not dispatch buildRequested when status is not Idle', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Building', accountId: accountIdA };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      renderHook(() => useCollateralState({ accountId: accountIdA, walletId }));

      expect(mockDispatchBuildRequested).not.toHaveBeenCalled();
    });

    it('does not dispatch buildRequested when wallet is null', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Idle' };
        if (selector === 'wallets.selectWalletById') return null;
        return defaultSelectorValue(selector);
      });

      renderHook(() => useCollateralState({ accountId: accountIdA, walletId }));

      expect(mockDispatchBuildRequested).not.toHaveBeenCalled();
    });
  });

  describe('state mapping', () => {
    // State mapping tests go through Idle → Building → target to activate
    // the hasInitiatedFlow gate, matching real component lifecycle.
    const renderWithFlowProgression = (
      targetState: Record<string, unknown>,
    ) => {
      let collateralState: Record<string, unknown> = { status: 'Idle' };
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState') return collateralState;
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const hook = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      // Progress through Idle → Building to activate hasInitiatedFlow
      collateralState = { status: 'Building', accountId: accountIdA };
      hook.rerender();

      // Transition to target state
      collateralState = targetState;
      hook.rerender();

      return hook;
    };

    it('returns "failure" when collateral flow status is Failure', () => {
      const { result } = renderWithFlowProgression({ status: 'Failure' });
      expect(result.current.state).toBe('failure');
    });

    it('returns "initializing" when status is Idle', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Idle' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.state).toBe('initializing');
    });

    it('returns "set" when status is Set', () => {
      const { result } = renderWithFlowProgression({
        status: 'Set',
        accountId: accountIdA,
        txKey: 'txKey',
      });
      expect(result.current.state).toBe('set');
    });

    it('returns "not-set" when status is Ready', () => {
      const { result } = renderWithFlowProgression({
        status: 'Ready',
        accountId: accountIdA,
      });
      expect(result.current.state).toBe('not-set');
    });

    it('returns "not-enough-balance" when status is NotEnoughBalance', () => {
      const { result } = renderWithFlowProgression({
        status: 'NotEnoughBalance',
        accountId: accountIdA,
      });
      expect(result.current.state).toBe('not-enough-balance');
    });
  });

  describe('isProcessing', () => {
    it('returns true when status is Building', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Building', accountId: accountIdA };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.isProcessing).toBe(true);
    });

    it('returns false when status is Idle', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Idle' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('handlers', () => {
    it('handleClose dispatches closed', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Idle' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      act(() => {
        result.current.handleClose();
      });

      expect(mockDispatchClosed).toHaveBeenCalled();
    });

    it('handleSetCollateral dispatches confirmed when status is Ready', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Ready', accountId: accountIdA };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      act(() => {
        result.current.handleSetCollateral();
      });

      expect(mockDispatchConfirmed).toHaveBeenCalled();
    });

    it('handleSetCollateral does nothing when status is not Ready', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Set', accountId: accountIdA, txKey: 'txKey' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      act(() => {
        result.current.handleSetCollateral();
      });

      expect(mockDispatchConfirmed).not.toHaveBeenCalled();
    });

    it('handleReclaimCollateral dispatches reclaimRequested when status is Set', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Set', accountId: accountIdA, txKey: 'txKey' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      act(() => {
        result.current.handleReclaimCollateral();
      });

      expect(mockDispatchReclaimRequested).toHaveBeenCalled();
    });

    it('handleReclaimCollateral does nothing when status is not Set', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Ready', accountId: accountIdA };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      act(() => {
        result.current.handleReclaimCollateral();
      });

      expect(mockDispatchReclaimRequested).not.toHaveBeenCalled();
    });
  });

  describe('toast and sheet close only for current account', () => {
    it('does not show toast or close sheet when flow completes for a different account', () => {
      let collateralState: { status: string; accountId?: string } = {
        status: 'Submitting',
        accountId: accountIdA,
      };
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState') return collateralState;
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdB);
        return defaultSelectorValue(selector);
      });

      const { rerender } = renderHook(
        ({ accountId }) => useCollateralState({ accountId, walletId }),
        { initialProps: { accountId: accountIdB } },
      );

      collateralState = { status: 'Idle' };
      rerender({ accountId: accountIdB });

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockSheetsClose).not.toHaveBeenCalled();
    });
  });

  describe('collateralAmount', () => {
    it('returns 5 ADA from constant', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Idle' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.collateralAmount).toBe(5);
    });
  });

  describe('cleanup on unmount (Idle guard)', () => {
    it('does not dispatch closed when status is already Idle', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Idle' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { unmount } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      mockDispatchClosed.mockClear();
      unmount();

      expect(mockDispatchClosed).not.toHaveBeenCalled();
    });

    it('dispatches closed when status is not Idle', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Ready', accountId: accountIdA };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { unmount } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      unmount();

      expect(mockDispatchClosed).toHaveBeenCalled();
    });
  });

  describe('currency', () => {
    it('returns currency preference from selector', () => {
      const currency = { name: 'Euro', ticker: 'EUR' };
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Idle' };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        if (selector === 'tokenPricing.selectCurrencyPreference')
          return currency;
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.currency).toEqual(currency);
    });
  });

  describe('estimatedFee fiat gated by token pricing', () => {
    const readyStateWithFees = {
      status: 'Ready',
      accountId: accountIdA,
      fees: [{ tokenId: 'lovelace', amount: '200000' }],
    };
    const adaPrices = {
      'cardano:ada': { price: 0.5, lastUpdated: 0 },
    };

    it('includes fiat values on mainnet with TOKEN_PRICING flag', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return readyStateWithFees;
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        if (selector === 'network.selectNetworkType') return 'mainnet';
        if (selector === 'features.selectLoadedFeatures')
          return { featureFlags: [{ key: 'TOKEN_PRICING' }] };
        if (selector === 'tokenPricing.selectPrices') return adaPrices;
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.estimatedFee?.fiat).toBeDefined();
      expect(result.current.estimatedFee?.fiatFormatted).toBeDefined();
    });

    it('omits fiat values on testnet', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return readyStateWithFees;
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        if (selector === 'network.selectNetworkType') return 'testnet';
        if (selector === 'features.selectLoadedFeatures')
          return { featureFlags: [{ key: 'TOKEN_PRICING' }] };
        if (selector === 'tokenPricing.selectPrices') return adaPrices;
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.estimatedFee?.ada).toBeDefined();
      expect(result.current.estimatedFee?.fiat).toBeUndefined();
      expect(result.current.estimatedFee?.fiatFormatted).toBeUndefined();
    });

    it('omits fiat values when TOKEN_PRICING flag is missing', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return readyStateWithFees;
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        if (selector === 'network.selectNetworkType') return 'mainnet';
        if (selector === 'features.selectLoadedFeatures')
          return { featureFlags: [] };
        if (selector === 'tokenPricing.selectPrices') return adaPrices;
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.estimatedFee?.ada).toBeDefined();
      expect(result.current.estimatedFee?.fiat).toBeUndefined();
      expect(result.current.estimatedFee?.fiatFormatted).toBeUndefined();
    });
  });

  describe('hasInitiatedFlow render gate', () => {
    it('returns "initializing" when mounted with stale Ready state', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState')
          return { status: 'Ready', accountId: accountIdA };
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      // Flow hasn't progressed past Idle for this instance, so state
      // should be "initializing" regardless of the stale Ready status.
      expect(result.current.state).toBe('initializing');
    });

    it('returns correct state after flow progresses through Idle → non-Idle', () => {
      let collateralState: Record<string, unknown> = { status: 'Idle' };

      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'collateralFlow.selectState') return collateralState;
        if (selector === 'wallets.selectWalletById')
          return createMockWallet(accountIdA);
        return defaultSelectorValue(selector);
      });

      const { result, rerender } = renderHook(() =>
        useCollateralState({ accountId: accountIdA, walletId }),
      );

      expect(result.current.state).toBe('initializing');

      // Simulate flow progressing: Idle → Building (hasInitiatedFlow flips)
      collateralState = { status: 'Building', accountId: accountIdA };
      rerender();

      expect(result.current.state).toBe('initializing');

      // Simulate flow reaching Ready
      collateralState = { status: 'Ready', accountId: accountIdA };
      rerender();

      expect(result.current.state).toBe('not-set');
    });
  });
});
