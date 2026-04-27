/**
 * @vitest-environment jsdom
 */
import { NavigationControls } from '@lace-lib/navigation';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APIErrorCode } from '../../../src/common/api-error';
import * as hooksModule from '../../../src/common/hooks';
import { useSignTxData } from '../../../src/common/hooks/useSignTxData';
import { useSignTx } from '../../../src/mobile/pages/SignTx/useSignTx';

import type { UseSignTxDataResult } from '../../../src/common/hooks';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: {
      close: vi.fn(),
    },
  },
}));

vi.mock('../../../src/common/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(() => vi.fn()),
  useSignDataAccountInfo: vi.fn(),
}));

vi.mock('../../../src/common/hooks/useSignTxData', () => ({
  useSignTxData: vi.fn(),
}));

const mockUseSignTxData = vi.mocked(useSignTxData);
const mockSheetsClose = vi.mocked(NavigationControls.sheets.close);

const REQUEST_ID = 'req-sign-tx-1';

const mockDapp = {
  icon: { type: 'uri' as const, uri: 'https://dapp.example/icon.png' },
  name: 'Test DApp',
  origin: 'https://dapp.example',
};

const createMockProps = (
  overrides: Partial<{
    requestId: string;
    txHex: string;
    partialSign: boolean;
  }> = {},
): SheetScreenProps<SheetRoutes.SignTx> =>
  ({
    route: {
      params: {
        requestId: overrides.requestId ?? REQUEST_ID,
        dapp: mockDapp,
        txHex: overrides.txHex ?? 'abcd1234',
        partialSign: overrides.partialSign ?? false,
      },
    },
  } as unknown as SheetScreenProps<SheetRoutes.SignTx>);

const EMPTY_SIGN_TX_DATA: UseSignTxDataResult = {
  transactionInfo: null,
  transactionError: null,
  ownAddresses: [],
  addressToNameMap: new Map(),
  fromAddresses: new Map(),
  toAddresses: new Map(),
  tokensMetadata: {},
  collateralValue: undefined,
  isLoadingCollateral: false,
  isResolvingInputs: false,
  expiresBy: null,
  coinSymbol: 'ADA',
  networkMagic: undefined,
  accountInfo: undefined,
  tokenPrices: undefined,
  currencyTicker: undefined,
};

describe('useSignTx (mobile)', () => {
  const mockDispatchConfirmSignTx = vi.fn();
  const mockDispatchRejectSignTx = vi.fn();
  const mockDispatchClearPendingSignTxRequest = vi.fn();
  const mockDispatchClearWebViewResponse = vi.fn();

  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const mockUseDispatchLaceAction = vi.mocked(
    hooksModule.useDispatchLaceAction,
  );

  type DispatchLaceActionReturn = ReturnType<
    typeof hooksModule.useDispatchLaceAction
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSignTxData.mockReturnValue(EMPTY_SIGN_TX_DATA);

    mockUseDispatchLaceAction.mockImplementation((actionName: string) => {
      if (actionName === 'cardanoDappConnector.confirmSignTx') {
        return mockDispatchConfirmSignTx as unknown as DispatchLaceActionReturn;
      }
      if (actionName === 'cardanoDappConnector.rejectSignTx') {
        return mockDispatchRejectSignTx as unknown as DispatchLaceActionReturn;
      }
      if (actionName === 'cardanoDappConnector.clearPendingSignTxRequest') {
        return mockDispatchClearPendingSignTxRequest as unknown as DispatchLaceActionReturn;
      }
      if (actionName === 'cardanoDappConnector.clearWebViewResponse') {
        return mockDispatchClearWebViewResponse as unknown as DispatchLaceActionReturn;
      }
      return vi.fn() as unknown as DispatchLaceActionReturn;
    });

    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
        return { id: REQUEST_ID };
      if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
        return [];
      return undefined;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ───────────── Common: route params passthrough ─────────────

  describe('route params', () => {
    it('passes through requestId, dapp, txHex and isPartialSign from params', () => {
      const { result } = renderHook(() =>
        useSignTx(createMockProps({ partialSign: true })),
      );

      expect(result.current.requestId).toBe(REQUEST_ID);
      expect(result.current.dapp).toBe(mockDapp);
      expect(result.current.txHex).toBe('abcd1234');
      expect(result.current.isPartialSign).toBe(true);
    });
  });

  // ───────────── Common: isLoading ─────────────

  describe('isLoading', () => {
    it('returns false when pendingRequest exists', () => {
      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.isLoading).toBe(false);
    });

    it('returns true when no pendingRequest and no requestId', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return null;
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [];
        return undefined;
      });

      const props = createMockProps({ requestId: '' as string });
      const { result } = renderHook(() => useSignTx(props));

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ───────────── Common: handleConfirm ─────────────

  describe('handleConfirm', () => {
    it('dispatches confirmSignTx and sets isSigning to true', () => {
      const { result } = renderHook(() => useSignTx(createMockProps()));

      act(() => {
        result.current.handleConfirm();
      });

      expect(mockDispatchConfirmSignTx).toHaveBeenCalled();
      expect(result.current.isSigning).toBe(true);
    });
  });

  // ───────────── Common: handleReject ─────────────

  describe('handleReject', () => {
    it('dispatches rejectSignTx and closes the sheet', () => {
      const { result } = renderHook(() => useSignTx(createMockProps()));

      act(() => {
        result.current.handleReject();
      });

      expect(mockDispatchRejectSignTx).toHaveBeenCalled();
      expect(mockSheetsClose).toHaveBeenCalled();
    });
  });

  // ───────────── Common: handleCloseResult ─────────────

  describe('handleCloseResult', () => {
    it('clears webView response and pending request then closes sheet', () => {
      const { result } = renderHook(() => useSignTx(createMockProps()));

      act(() => {
        result.current.handleCloseResult();
      });

      expect(mockDispatchClearWebViewResponse).toHaveBeenCalledWith(REQUEST_ID);
      expect(mockDispatchClearPendingSignTxRequest).toHaveBeenCalled();
      expect(mockSheetsClose).toHaveBeenCalled();
    });
  });

  // ───────────── Common: close when no pending request ─────────────

  describe('auto-close when no pending request', () => {
    it('closes sheet when no pendingRequest, no requestId, and no result', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return null;
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [];
        return undefined;
      });

      renderHook(() => useSignTx(createMockProps({ requestId: '' })));

      expect(mockSheetsClose).toHaveBeenCalled();
    });

    it('does not close sheet when a result exists', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return null;
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [{ id: REQUEST_ID, success: true, timestamp: 1 }];
        return undefined;
      });

      renderHook(() => useSignTx(createMockProps()));

      expect(mockSheetsClose).not.toHaveBeenCalled();
    });
  });

  // ───────────── Common: unmount rejection guard ─────────────

  describe('unmount rejection guard', () => {
    it('rejects on unmount when user has not responded', () => {
      const { unmount } = renderHook(() => useSignTx(createMockProps()));

      unmount();

      expect(mockDispatchRejectSignTx).toHaveBeenCalled();
    });

    it('does not reject on unmount when user already confirmed', () => {
      const { result, unmount } = renderHook(() =>
        useSignTx(createMockProps()),
      );

      act(() => {
        result.current.handleConfirm();
      });

      vi.clearAllMocks();
      unmount();

      expect(mockDispatchRejectSignTx).not.toHaveBeenCalled();
    });

    it('does not reject on unmount when user already rejected', () => {
      const { result, unmount } = renderHook(() =>
        useSignTx(createMockProps()),
      );

      act(() => {
        result.current.handleReject();
      });

      vi.clearAllMocks();
      unmount();

      expect(mockDispatchRejectSignTx).not.toHaveBeenCalled();
    });

    it('does not reject on unmount when no pending request', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return null;
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [];
        return undefined;
      });

      const { unmount } = renderHook(() => useSignTx(createMockProps()));

      vi.clearAllMocks();
      unmount();

      expect(mockDispatchRejectSignTx).not.toHaveBeenCalled();
    });
  });

  // ───────────── SignTx-specific: useSignTxData integration ─────────────

  describe('useSignTxData integration', () => {
    it('spreads useSignTxData result into returned object', () => {
      const customData: UseSignTxDataResult = {
        ...EMPTY_SIGN_TX_DATA,
        coinSymbol: 'tADA',
        collateralValue: 5_000_000n,
      };
      mockUseSignTxData.mockReturnValue(customData);

      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.coinSymbol).toBe('tADA');
      expect(result.current.collateralValue).toBe(5_000_000n);
    });

    it('calls useSignTxData with txHex from params', () => {
      renderHook(() => useSignTx(createMockProps({ txHex: 'cafe0001' })));

      expect(mockUseSignTxData).toHaveBeenCalledWith({ txHex: 'cafe0001' });
    });
  });

  // ───────────── SignTx-specific: isSigning state ─────────────

  describe('isSigning', () => {
    it('starts as false', () => {
      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.isSigning).toBe(false);
    });

    it('resets to false when signTxResult arrives', () => {
      const { result, rerender } = renderHook(() =>
        useSignTx(createMockProps()),
      );

      act(() => {
        result.current.handleConfirm();
      });
      expect(result.current.isSigning).toBe(true);

      // Simulate success response arriving
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [{ id: REQUEST_ID, success: true, timestamp: 1 }];
        return undefined;
      });

      rerender();

      expect(result.current.isSigning).toBe(false);
    });
  });

  // ───────────── SignTx-specific: signTxResult computation ─────────────

  describe('signTxResult', () => {
    it('returns null when no response and not completed', () => {
      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.signTxResult).toBeNull();
    });

    it('returns success when webViewResponse has success', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [{ id: REQUEST_ID, success: true, timestamp: 1 }];
        return undefined;
      });

      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.signTxResult).toEqual({ state: 'success' });
    });

    it('returns rejected when error code is APIErrorCode.Refused', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [
            {
              id: REQUEST_ID,
              success: false,
              error: { code: APIErrorCode.Refused, info: 'User refused' },
              timestamp: 1,
            },
          ];
        return undefined;
      });

      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.signTxResult).toEqual({
        state: 'rejected',
        error: {
          message: 'User refused',
          code: String(APIErrorCode.Refused),
        },
      });
    });

    it('returns failure with error details for non-Refused errors', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [
            {
              id: REQUEST_ID,
              success: false,
              error: { code: APIErrorCode.InternalError, info: 'Crash' },
              timestamp: 1,
            },
          ];
        return undefined;
      });

      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.signTxResult).toEqual({
        state: 'failure',
        error: {
          message: 'Crash',
          code: String(APIErrorCode.InternalError),
        },
      });
    });

    it('returns failure without error details when error is undefined', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [
            {
              id: REQUEST_ID,
              success: false,
              timestamp: 1,
            },
          ];
        return undefined;
      });

      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.signTxResult).toEqual({
        state: 'failure',
        error: undefined,
      });
    });

    it('ignores responses for a different requestId', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignTxRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [{ id: 'other-request', success: true, timestamp: 1 }];
        return undefined;
      });

      const { result } = renderHook(() => useSignTx(createMockProps()));

      expect(result.current.signTxResult).toBeNull();
    });
  });
});
