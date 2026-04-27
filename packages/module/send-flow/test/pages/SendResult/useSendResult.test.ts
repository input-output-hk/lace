/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../../src/hooks';
import { useSendResult } from '../../../src/pages/SendResult/useSendResult';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

// Hoisted mocks - these must be defined before module mocks
const mockUseUICustomisation = vi.hoisted(() => vi.fn());
const mockParseErrorDetails = vi.hoisted(() => vi.fn());

// Mock the hooks module
vi.mock('../../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(() => vi.fn()),
}));

// Mock app contract (useUICustomisation uses LoadModulesProvider otherwise)
vi.mock('@lace-contract/app', () => ({
  useUICustomisation: () => [undefined],
}));

// Mock send-flow contract
vi.mock('@lace-contract/send-flow', () => ({
  useSendFlow: () => ({
    resetSendFlow: vi.fn(),
  }),
  isSendFlowSuccess: (state: { status: string }) => state.status === 'Success',
}));

// Mock i18n
vi.mock('@lace-contract/i18n', () => ({
  DEFAULT_LANGUAGE: 'en',
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock app contract
vi.mock('@lace-contract/app', () => ({
  useUICustomisation: mockUseUICustomisation,
}));

// Mock navigation
vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: {
      close: vi.fn(),
      navigate: vi.fn(),
    },
  },
  SheetRoutes: {
    Send: 'Send',
  },
}));

// Mock useSendFlowNavigation
vi.mock('../../../src/hooks/useSendFlowNavigation', () => ({
  useSendFlowNavigation: () => ({
    navigate: vi.fn(),
  }),
}));

// Mock parseErrorDetails
vi.mock('../../../src/pages/SendResult/parseErrorDetails', () => ({
  parseErrorDetails: mockParseErrorDetails,
}));

describe('useSendResult', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);

  const createMockProps = (
    status: 'failure' | 'processing' | 'success' = 'processing',
    blockchain = 'Cardano',
  ): SheetScreenProps<SheetRoutes.SendResult> =>
    ({
      route: {
        params: {
          accountId: 'test-account',
          result: {
            status,
            blockchain,
          },
        },
      },
      navigation: {
        setOptions: vi.fn(),
      },
    } as unknown as SheetScreenProps<SheetRoutes.SendResult>);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock: state machine in Processing state
    mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

    // Default mock: no UI customisation (close button should be shown)
    mockUseUICustomisation.mockReturnValue([undefined]);

    // Default mock: parseErrorDetails returns basic error info
    mockParseErrorDetails.mockReturnValue({
      errorMessage: 'Test error message',
      errorCode: 'TEST_ERROR_CODE',
      timestamp: '2024-01-01T00:00:00Z',
      requestId: 'test-request-id',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('minimum display time', () => {
    it('shows processing state initially regardless of state machine status', () => {
      // State machine already at Success
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      // Should still show processing because minimum time hasn't elapsed
      expect(result.current.result.status).toBe('processing');
    });

    it('shows processing state after 500ms even if state machine is Success', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Still processing - minimum 1000ms not reached
      expect(result.current.result.status).toBe('processing');
    });

    it('shows success state after 1000ms when state machine is Success', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.result.status).toBe('success');
    });

    it('shows failure state immediately when state machine is Failure (no minimum wait)', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Failure' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      // Failure should show immediately without waiting for the timer
      // This prevents showing "processing" when auth was cancelled
      expect(result.current.result.status).toBe('failure');
    });

    it('keeps showing processing after 1000ms if state machine is still Processing', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.result.status).toBe('processing');
    });
  });

  describe('state transitions', () => {
    it('transitions to success when state machine changes after minimum time', () => {
      // Start with Processing
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result, rerender } = renderHook(() =>
        useSendResult(createMockProps()),
      );

      // Wait for minimum time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Still processing because state machine is Processing
      expect(result.current.result.status).toBe('processing');

      // State machine transitions to Success
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });
      rerender();

      expect(result.current.result.status).toBe('success');
    });
  });

  describe('UI properties based on status', () => {
    it('returns Clock icon for processing state', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      expect(result.current.icon.name).toBe('Clock');
      expect(result.current.icon.variant).toBe('stroke');
    });

    it('returns RelievedFace icon for success state after minimum time', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.icon.name).toBe('RelievedFace');
      expect(result.current.icon.variant).toBe('solid');
    });

    it('returns Sad icon for failure state immediately (no minimum wait)', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Failure' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      // Failure should show immediately without waiting for the timer
      expect(result.current.icon.name).toBe('Sad');
      expect(result.current.icon.variant).toBe('solid');
    });

    it('returns processing title and subtitle initially', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      expect(result.current.headerTitle).toBe('v2.send-flow.processing-title');
      expect(result.current.subtitle).toBe('v2.send-flow.processing-subtitle');
    });

    it('returns success title and subtitle after transition', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.headerTitle).toBe('v2.send-flow.success.title');
      expect(result.current.subtitle).toBe('v2.send-flow.success.subtitle');
    });
  });

  describe('footer buttons', () => {
    it('has no primary button during processing', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      expect(result.current.footer.primaryButton).toBeUndefined();
    });

    it('has no primary button on success while view transaction is not implemented', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.footer.primaryButton).toBeUndefined();
    });

    it('has primary button for failure state immediately (no minimum wait)', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Failure' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      // Failure should show immediately without waiting for the timer
      expect(result.current.footer.primaryButton).toBeDefined();
      expect(result.current.footer.primaryButton?.primaryButtonLabel).toBe(
        'v2.send-flow.failure.primary-button',
      );
    });

    it('has close button by default', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      expect(result.current.footer.closeButton).toBeDefined();
      expect(result.current.footer.closeButton?.closeButtonLabel).toEqual(
        'v2.send-flow.transaction-result.sheet-close-button',
      );
    });

    it('hides close button when processing state is not closable per UI customisation', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });
      mockUseUICustomisation.mockReturnValue([
        { isProcessingResultSheetClosable: false },
      ]);

      const { result } = renderHook(() => useSendResult(createMockProps()));

      expect(result.current.footer.closeButton).toBeUndefined();
    });

    it('shows close button when processing state is closable per UI customisation', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });
      mockUseUICustomisation.mockReturnValue([
        { isProcessingResultSheetClosable: true },
      ]);

      const { result } = renderHook(() => useSendResult(createMockProps()));

      expect(result.current.footer.closeButton).toBeDefined();
    });

    it('shows close button in success state even if UI customisation disables processing state closing', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });
      mockUseUICustomisation.mockReturnValue([
        { isProcessingResultSheetClosable: false },
      ]);

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Close button should be available in success state
      expect(result.current.footer.closeButton).toBeDefined();
    });

    it('shows close button in failure state even if UI customisation disables processing state closing', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Failure' });
      mockUseUICustomisation.mockReturnValue([
        { isProcessingResultSheetClosable: false },
      ]);

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Close button should be available in failure state
      expect(result.current.footer.closeButton).toBeDefined();
    });
  });

  describe('blockchain context', () => {
    it('preserves blockchain from route params', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result } = renderHook(() =>
        useSendResult(createMockProps('processing', 'Midnight')),
      );

      expect(result.current.result.blockchain).toBe('Midnight');
    });

    it('uses Midnight-specific subtitle for Midnight blockchain', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result } = renderHook(() =>
        useSendResult(createMockProps('processing', 'Midnight')),
      );

      expect(result.current.subtitle).toBe(
        'midnight.send-flow.processing.info',
      );
    });
  });

  describe('timer cleanup', () => {
    it('cleans up timer on unmount', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { unmount } = renderHook(() => useSendResult(createMockProps()));

      // Unmount before timer fires
      unmount();

      // Advance timer - should not cause errors
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // If we get here without errors, cleanup worked
      expect(true).toBe(true);
    });
  });

  describe('preventClose navigation option', () => {
    it('sets preventClose to true when processing and UI customisation disables closing', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });
      mockUseUICustomisation.mockReturnValue([
        { isProcessingResultSheetClosable: false },
      ]);

      const mockProps = createMockProps();
      renderHook(() => useSendResult(mockProps));

      expect(mockProps.navigation.setOptions).toHaveBeenCalledWith({
        preventClose: true,
      });
    });

    it('sets preventClose to false by default', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const mockProps = createMockProps();
      renderHook(() => useSendResult(mockProps));

      expect(mockProps.navigation.setOptions).toHaveBeenCalledWith({
        preventClose: false,
      });
    });

    it('sets preventClose to false in success state', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });
      mockUseUICustomisation.mockReturnValue([
        { isProcessingResultSheetClosable: false },
      ]);

      const mockProps = createMockProps();
      renderHook(() => useSendResult(mockProps));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockProps.navigation.setOptions).toHaveBeenCalledWith({
        preventClose: false,
      });
    });
  });

  describe('error details', () => {
    it('returns undefined errorDetails when not in failure state', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Processing' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      expect(result.current.errorDetails).toBeUndefined();
    });

    it('returns undefined errorDetails when in success state', () => {
      mockUseLaceSelector.mockReturnValue({ status: 'Success' });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errorDetails).toBeUndefined();
    });

    it('calls parseErrorDetails with error from state machine in failure state', () => {
      const mockError = {
        code: 'NETWORK_TIMEOUT',
        message: 'Network timeout error',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req-123',
      };

      mockUseLaceSelector.mockReturnValue({
        status: 'Failure',
        error: mockError,
      });

      renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockParseErrorDetails).toHaveBeenCalledWith(
        mockError,
        'v2.send-flow.failure.network-timeout-error-message',
        {
          codeTitle: 'v2.send-flow.failure.network-timeout-error-code-title',
          timestampTitle:
            'v2.send-flow.failure.network-timeout-error-timestamp-title',
          requestIdTitle:
            'v2.send-flow.failure.network-timeout-error-request-id-title',
        },
      );
    });

    it('returns properly structured errorDetails in failure state', () => {
      mockParseErrorDetails.mockReturnValue({
        errorMessage: 'Custom error message',
        errorCode: 'ERR_001',
        timestamp: '2024-01-01T12:00:00Z',
        requestId: 'req-456',
      });

      mockUseLaceSelector.mockReturnValue({
        status: 'Failure',
        error: { code: 'TEST' },
      });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errorDetails).toEqual({
        title: 'v2.send-flow.failure.details-title',
        description: 'Custom error message\n',
        errorCode: 'ERR_001',
        timestamp: '2024-01-01T12:00:00Z',
        requestId: 'req-456',
      });
    });

    it('handles failure state with undefined error', () => {
      mockUseLaceSelector.mockReturnValue({
        status: 'Failure',
        error: undefined,
      });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should still call parseErrorDetails with undefined error
      expect(mockParseErrorDetails).toHaveBeenCalledWith(
        undefined,
        'v2.send-flow.failure.network-timeout-error-message',
        expect.any(Object),
      );

      // Should still return errorDetails structure
      expect(result.current.errorDetails).toBeDefined();
      expect(result.current.errorDetails?.title).toBe(
        'v2.send-flow.failure.details-title',
      );
    });

    it('appends newline to error message in description', () => {
      mockParseErrorDetails.mockReturnValue({
        errorMessage: 'Error without trailing newline',
        errorCode: null,
        timestamp: null,
        requestId: null,
      });

      mockUseLaceSelector.mockReturnValue({
        status: 'Failure',
        error: { code: 'TEST' },
      });

      const { result } = renderHook(() => useSendResult(createMockProps()));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.errorDetails?.description).toBe(
        'Error without trailing newline\n',
      );
    });
  });
});
