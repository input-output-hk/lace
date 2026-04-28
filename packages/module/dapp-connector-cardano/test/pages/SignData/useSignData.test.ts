/**
 * @vitest-environment jsdom
 */
import { NavigationControls } from '@lace-lib/navigation';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APIErrorCode } from '../../../src/common/api-error';
import * as hooksModule from '../../../src/common/hooks';
import { useSignData } from '../../../src/mobile/pages/SignData/useSignData';

import type { SignDataAccountInfo } from '../../../src/common/types/sign-data-account';
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

const mockSheetsClose = vi.mocked(NavigationControls.sheets.close);

const REQUEST_ID = 'req-sign-data-1';

const mockDapp = {
  icon: { type: 'uri' as const, uri: 'https://dapp.example/icon.png' },
  name: 'Test DApp',
  origin: 'https://dapp.example',
};

const createMockProps = (
  overrides: Partial<{
    requestId: string;
    address: string;
    payload: string;
  }> = {},
): SheetScreenProps<SheetRoutes.SignData> =>
  ({
    route: {
      params: {
        requestId: overrides.requestId ?? REQUEST_ID,
        dapp: mockDapp,
        address: overrides.address ?? 'addr_test1abc',
        payload: overrides.payload ?? '48656c6c6f',
      },
    },
  } as unknown as SheetScreenProps<SheetRoutes.SignData>);

describe('useSignData (mobile)', () => {
  const mockDispatchConfirmSignData = vi.fn();
  const mockDispatchRejectSignData = vi.fn();
  const mockDispatchClearPendingSignDataRequest = vi.fn();
  const mockDispatchClearWebViewResponse = vi.fn();

  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
  const mockUseDispatchLaceAction = vi.mocked(
    hooksModule.useDispatchLaceAction,
  );
  const mockUseSignDataAccountInfo = vi.mocked(
    hooksModule.useSignDataAccountInfo,
  );

  type DispatchLaceActionReturn = ReturnType<
    typeof hooksModule.useDispatchLaceAction
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSignDataAccountInfo.mockReturnValue(undefined);

    mockUseDispatchLaceAction.mockImplementation((actionName: string) => {
      if (actionName === 'cardanoDappConnector.confirmSignData') {
        return mockDispatchConfirmSignData as unknown as DispatchLaceActionReturn;
      }
      if (actionName === 'cardanoDappConnector.rejectSignData') {
        return mockDispatchRejectSignData as unknown as DispatchLaceActionReturn;
      }
      if (actionName === 'cardanoDappConnector.clearPendingSignDataRequest') {
        return mockDispatchClearPendingSignDataRequest as unknown as DispatchLaceActionReturn;
      }
      if (actionName === 'cardanoDappConnector.clearWebViewResponse') {
        return mockDispatchClearWebViewResponse as unknown as DispatchLaceActionReturn;
      }
      return vi.fn() as unknown as DispatchLaceActionReturn;
    });

    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
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
    it('passes through requestId, address and payload from params', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.requestId).toBe(REQUEST_ID);
      expect(result.current.address).toBe('addr_test1abc');
      expect(result.current.payload).toBe('48656c6c6f');
    });
  });

  // ───────────── Common: isLoading ─────────────

  describe('isLoading', () => {
    it('returns false when pendingRequest exists', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.isLoading).toBe(false);
    });

    it('returns true when no pendingRequest and no requestId', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
          return null;
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [];
        return undefined;
      });

      const props = createMockProps({ requestId: '' as string });
      const { result } = renderHook(() => useSignData(props));

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ───────────── Common: handleConfirm ─────────────

  describe('handleConfirm', () => {
    it('dispatches confirmSignData', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      act(() => {
        result.current.handleConfirm();
      });

      expect(mockDispatchConfirmSignData).toHaveBeenCalled();
    });
  });

  // ───────────── Common: handleReject ─────────────

  describe('handleReject', () => {
    it('dispatches rejectSignData and closes the sheet', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      act(() => {
        result.current.handleReject();
      });

      expect(mockDispatchRejectSignData).toHaveBeenCalled();
      expect(mockSheetsClose).toHaveBeenCalled();
    });
  });

  // ───────────── Common: handleCloseResult ─────────────

  describe('handleCloseResult', () => {
    it('clears webView response and pending request then closes sheet', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      act(() => {
        result.current.handleCloseResult();
      });

      expect(mockDispatchClearWebViewResponse).toHaveBeenCalledWith(REQUEST_ID);
      expect(mockDispatchClearPendingSignDataRequest).toHaveBeenCalled();
      expect(mockSheetsClose).toHaveBeenCalled();
    });
  });

  // ───────────── Common: close when no pending request ─────────────

  describe('auto-close when no pending request', () => {
    it('closes sheet when no pendingRequest, no requestId, and no result', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
          return null;
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [];
        return undefined;
      });

      renderHook(() => useSignData(createMockProps({ requestId: '' })));

      expect(mockSheetsClose).toHaveBeenCalled();
    });

    it('does not close sheet when a result exists', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
          return null;
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [{ id: REQUEST_ID, success: true, timestamp: 1 }];
        return undefined;
      });

      renderHook(() => useSignData(createMockProps()));

      expect(mockSheetsClose).not.toHaveBeenCalled();
    });
  });

  // ───────────── Common: unmount rejection guard ─────────────

  describe('unmount rejection guard', () => {
    it('rejects on unmount when user has not responded', () => {
      const { unmount } = renderHook(() => useSignData(createMockProps()));

      unmount();

      expect(mockDispatchRejectSignData).toHaveBeenCalled();
    });

    it('does not reject on unmount when user already confirmed', () => {
      const { result, unmount } = renderHook(() =>
        useSignData(createMockProps()),
      );

      act(() => {
        result.current.handleConfirm();
      });

      vi.clearAllMocks();
      unmount();

      expect(mockDispatchRejectSignData).not.toHaveBeenCalled();
    });

    it('does not reject on unmount when user already rejected', () => {
      const { result, unmount } = renderHook(() =>
        useSignData(createMockProps()),
      );

      act(() => {
        result.current.handleReject();
      });

      vi.clearAllMocks();
      unmount();

      expect(mockDispatchRejectSignData).not.toHaveBeenCalled();
    });

    it('does not reject on unmount when no pending request', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
          return null;
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [];
        return undefined;
      });

      const { unmount } = renderHook(() => useSignData(createMockProps()));

      vi.clearAllMocks();
      unmount();

      expect(mockDispatchRejectSignData).not.toHaveBeenCalled();
    });
  });

  // ───────────── SignData-specific: signDataResult computation ─────────────

  describe('signDataResult', () => {
    it('returns null when no response and not completed', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.signDataResult).toBeNull();
    });

    it('returns success when webViewResponse has success', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [{ id: REQUEST_ID, success: true, timestamp: 1 }];
        return undefined;
      });

      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.signDataResult).toEqual({ state: 'success' });
    });

    it('returns failure when webViewResponse has success: false', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [{ id: REQUEST_ID, success: false, timestamp: 1 }];
        return undefined;
      });

      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.signDataResult).toEqual({
        state: 'failure',
        error: undefined,
      });
    });

    it('ignores responses for a different requestId', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
          return { id: REQUEST_ID };
        if (selector === 'cardanoDappConnector.selectWebViewResponseQueue')
          return [{ id: 'other-request', success: true, timestamp: 1 }];
        return undefined;
      });

      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.signDataResult).toBeNull();
    });
  });

  // ───────────── SignData-specific: dapp transformation ─────────────

  describe('dapp transformation', () => {
    it('maps dapp params to SignDataDisplayDapp', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.dapp).toEqual({
        icon: mockDapp.icon,
        name: mockDapp.name,
        origin: mockDapp.origin,
      });
    });
  });

  // ───────────── SignData-specific: accountInfo ─────────────

  describe('accountInfo', () => {
    it('returns undefined when useSignDataAccountInfo returns undefined', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.accountInfo).toBeUndefined();
    });

    it('returns account info when available', () => {
      const accountInfo: SignDataAccountInfo = {
        name: 'Wallet 1',
        avatarUri: 'https://example.com/avatar.png',
      };
      mockUseSignDataAccountInfo.mockReturnValue(accountInfo);

      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.accountInfo).toEqual(accountInfo);
    });
  });

  // ───────────── SignData-specific: no isSigning state ─────────────

  describe('no isSigning state (differs from useSignTx)', () => {
    it('does not expose isSigning property', () => {
      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current).not.toHaveProperty('isSigning');
    });
  });

  // ───────────── SignData-specific: result uses same shape as SignTx ─────────────

  describe('result shape (same as useSignTx)', () => {
    it('returns rejected when error code is APIErrorCode.Refused', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'cardanoDappConnector.selectPendingSignDataRequest')
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

      const { result } = renderHook(() => useSignData(createMockProps()));

      expect(result.current.signDataResult).toEqual({
        state: 'rejected',
        error: {
          message: 'User refused',
          code: String(APIErrorCode.Refused),
        },
      });
    });
  });
});
