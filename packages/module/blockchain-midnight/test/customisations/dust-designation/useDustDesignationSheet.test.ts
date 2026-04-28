/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useDustDesignationSheet } from '../../../src/customisations/dust-designation/useDustDesignationSheet';

import type { SheetScreenProps } from '@lace-lib/navigation';
import type { SheetRoutes } from '@lace-lib/navigation';

// Mock navigation
const mockNavigate = vi.fn();
const mockClose = vi.fn();

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: {
    sheets: {
      navigate: (...arguments_: unknown[]): unknown =>
        mockNavigate(...arguments_),
      close: (): unknown => mockClose(),
    },
  },
  SheetRoutes: {
    DustDesignation: 'DustDesignation',
    SendResult: 'SendResult',
    Send: 'Send',
  },
  onSheetClose:
    (_listener: () => void): (() => void) =>
    () =>
      undefined,
}));

// Mock i18n
vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock midnight-context utilities
vi.mock('@lace-contract/midnight-context', () => ({
  DUST_TOKEN_DECIMALS: 8,
  getDustTokenTickerByNetwork: () => 'tDUST',
  getNightTokenTickerByNetwork: () => 'tNIGHT',
  isDustAddress: (address: string) => address?.startsWith('dust'),
}));

// Mock send-flow utilities
vi.mock('@lace-contract/send-flow', () => ({
  isSendFlowClosed: (state: { status: string }) => state.status === 'Idle',
  isSendFlowSuccess: (state: { status: string }) => state.status === 'Success',
  useSendFlow: () => ({ resetSendFlow: vi.fn() }),
}));

// Mock util-render
vi.mock('@lace-lib/util-render', () => ({
  convertAmountToDenominated: (amount: string) => amount,
  valueToLocale: (value: string) => value,
}));

// Mock lodash debounce
vi.mock('lodash/fp/debounce', () => ({
  default: (_ms: number, callback: (...arguments_: unknown[]) => unknown) => {
    const debounced = (...arguments_: unknown[]) => callback(...arguments_);
    debounced.cancel = vi.fn();
    debounced.flush = vi.fn();
    return debounced;
  },
}));

// Mock hooks module
const mockUseLaceSelector = vi.fn();

// Create separate mocks for each dispatch action to verify which actions are called
const mockDispatchClosed = vi.fn();
const mockDispatchOpenRequested = vi.fn();
const mockDispatchFormDataChanged = vi.fn();
const mockDispatchConfirm = vi.fn();
const mockDispatchBack = vi.fn();

const dispatchMocks: Record<string, ReturnType<typeof vi.fn>> = {
  'sendFlow.closed': mockDispatchClosed,
  'sendFlow.openRequested': mockDispatchOpenRequested,
  'sendFlow.formDataChanged': mockDispatchFormDataChanged,
  'sendFlow.confirmed': mockDispatchConfirm,
  'sendFlow.back': mockDispatchBack,
};

vi.mock('../../../src/hooks', () => ({
  useLaceSelector: (selector: string, ...args: unknown[]): unknown =>
    mockUseLaceSelector(selector, ...args),
  useDispatchLaceAction: (actionName: string): (() => void) =>
    dispatchMocks[actionName] ?? vi.fn(),
}));

describe('useDustDesignationSheet', () => {
  const mockAccountId = 'test-account-id';
  const mockOwnDustAddress = 'dust-own-address';
  const mockNightToken = {
    tokenId: 'night-token-id',
    available: BigInt(1000000000),
    decimals: 8,
    metadata: { ticker: 'tNIGHT' },
  };

  const mockProps: SheetScreenProps<SheetRoutes.DustDesignation> = {
    route: {
      params: {
        accountId: mockAccountId,
      },
    },
  } as SheetScreenProps<SheetRoutes.DustDesignation>;

  let sendFlowState: {
    status: string;
    form?: { address: { value: string; error: string | null } };
    fees?: unknown[];
    confirmButtonEnabled?: boolean;
  };

  const setupMocks = (overrideState?: Partial<typeof sendFlowState>) => {
    sendFlowState = {
      status: 'Summary',
      form: { address: { value: mockOwnDustAddress, error: null } },
      fees: [],
      confirmButtonEnabled: true,
      ...overrideState,
    };

    mockUseLaceSelector.mockImplementation(
      (selector: string, accountId?: string) => {
        switch (selector) {
          case 'sendFlow.selectSendFlowState':
            return sendFlowState;
          case 'midnightContext.selectNetworkId':
            return 'preprod';
          case 'addresses.selectByAccountId':
            return accountId === mockAccountId
              ? [{ address: mockOwnDustAddress }]
              : [];
          case 'tokens.selectTokensGroupedByAccount':
            return {
              [mockAccountId]: {
                fungible: [mockNightToken],
              },
            };
          case 'wallets.selectActiveNetworkAccounts':
            return [{ accountId: mockAccountId, blockchainName: 'Midnight' }];
          case 'midnightContext.selectDustGenerationDetails':
            return { [mockAccountId]: { currentValue: BigInt(1000000) } };
          default:
            return undefined;
        }
      },
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatchClosed.mockClear();
    mockDispatchOpenRequested.mockClear();
    mockDispatchFormDataChanged.mockClear();
    mockDispatchConfirm.mockClear();
    mockDispatchBack.mockClear();
    mockNavigate.mockClear();
    mockClose.mockClear();
  });

  describe('state transitions after confirmation', () => {
    it('navigates to SendResult with processing status when state becomes Processing after confirmation', () => {
      // Start with SummaryAwaitingConfirmation state after confirmation
      setupMocks({ status: 'SummaryAwaitingConfirmation' });

      const { result, rerender } = renderHook(() =>
        useDustDesignationSheet(mockProps),
      );

      // Trigger confirmation (sets hasInitiatedConfirmation = true)
      act(() => {
        result.current.handleConfirm();
      });

      // State transitions to Processing
      sendFlowState.status = 'Processing';
      rerender();

      expect(mockNavigate).toHaveBeenCalledWith(
        'SendResult',
        {
          accountId: mockAccountId,
          result: { status: 'processing', blockchain: 'Midnight' },
        },
        { reset: true },
      );
    });

    it('navigates to SendResult with processing status when state becomes SummaryAwaitingConfirmation after confirmation', () => {
      // Start with Summary state
      setupMocks({ status: 'Summary' });

      const { result, rerender } = renderHook(() =>
        useDustDesignationSheet(mockProps),
      );

      // Trigger confirmation
      act(() => {
        result.current.handleConfirm();
      });

      // State transitions to SummaryAwaitingConfirmation
      sendFlowState.status = 'SummaryAwaitingConfirmation';
      rerender();

      expect(mockNavigate).toHaveBeenCalledWith(
        'SendResult',
        {
          accountId: mockAccountId,
          result: { status: 'processing', blockchain: 'Midnight' },
        },
        { reset: true },
      );
    });

    it('navigates to SendResult with failure status when state becomes Failure after confirmation', () => {
      // Start with SummaryAwaitingConfirmation state
      setupMocks({ status: 'SummaryAwaitingConfirmation' });

      const { result, rerender } = renderHook(() =>
        useDustDesignationSheet(mockProps),
      );

      // Trigger confirmation (simulates user pressing confirm button)
      act(() => {
        result.current.handleConfirm();
      });

      // State transitions to Failure (e.g., hardware wallet rejection)
      sendFlowState.status = 'Failure';
      rerender();

      expect(mockNavigate).toHaveBeenCalledWith(
        'SendResult',
        {
          accountId: mockAccountId,
          result: { status: 'failure', blockchain: 'Midnight' },
        },
        { reset: true },
      );
    });

    it('does not navigate to SendResult when Failure occurs without confirmation being initiated', () => {
      // Start directly in Failure state without going through confirmation
      setupMocks({ status: 'Failure' });

      renderHook(() => useDustDesignationSheet(mockProps));

      // Should not navigate because confirmation was never initiated
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate when Processing occurs without confirmation being initiated', () => {
      // Start directly in Processing state without going through confirmation
      setupMocks({ status: 'Processing' });

      renderHook(() => useDustDesignationSheet(mockProps));

      // Should not navigate because confirmation was never initiated
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('resets hasInitiatedConfirmation flag after navigating to SendResult', () => {
      setupMocks({ status: 'Summary' });

      const { result, rerender } = renderHook(() =>
        useDustDesignationSheet(mockProps),
      );

      // Trigger confirmation
      act(() => {
        result.current.handleConfirm();
      });

      // Navigate to SendResult on Processing
      sendFlowState.status = 'Processing';
      rerender();

      expect(mockNavigate).toHaveBeenCalledTimes(1);

      // Clear mock to verify no further calls
      mockNavigate.mockClear();

      // Change to Failure state (simulating a new flow state change)
      sendFlowState.status = 'Failure';
      rerender();

      // Should NOT navigate again since flag was reset after first navigation
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('handleConfirm', () => {
    it('sets hasInitiatedConfirmation flag and dispatches confirm action', () => {
      setupMocks({ status: 'Summary' });

      const { result, rerender } = renderHook(() =>
        useDustDesignationSheet(mockProps),
      );

      // Call handleConfirm
      act(() => {
        result.current.handleConfirm();
      });

      // Verify dispatchConfirm was called
      expect(mockDispatchConfirm).toHaveBeenCalledTimes(1);

      // Verify that subsequent state change triggers navigation
      // (which only happens if hasInitiatedConfirmation was set)
      sendFlowState.status = 'SummaryAwaitingConfirmation';
      rerender();

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('currentStep derivation', () => {
    it('returns "review" when status is Summary', () => {
      setupMocks({ status: 'Summary' });

      const { result } = renderHook(() => useDustDesignationSheet(mockProps));

      expect(result.current.currentStep).toBe('review');
    });

    it('returns "review" when status is SummaryAwaitingConfirmation', () => {
      setupMocks({ status: 'SummaryAwaitingConfirmation' });

      const { result } = renderHook(() => useDustDesignationSheet(mockProps));

      expect(result.current.currentStep).toBe('review');
    });

    it('returns "form" when status is Failure', () => {
      setupMocks({ status: 'Failure' });

      const { result } = renderHook(() => useDustDesignationSheet(mockProps));

      // Failure is not in REVIEW_STATES, so currentStep becomes 'form'
      expect(result.current.currentStep).toBe('form');
    });

    it('returns "form" when status is Processing', () => {
      setupMocks({ status: 'Processing' });

      const { result } = renderHook(() => useDustDesignationSheet(mockProps));

      expect(result.current.currentStep).toBe('form');
    });
  });

  describe('stale state handling on mount', () => {
    it('resets stale Success state by calling dispatchClosed', () => {
      setupMocks({ status: 'Success' });

      renderHook(() => useDustDesignationSheet(mockProps));

      // dispatchClosed should be called to reset the terminal state
      expect(mockDispatchClosed).toHaveBeenCalledTimes(1);
      expect(mockDispatchOpenRequested).not.toHaveBeenCalled();
      expect(mockDispatchConfirm).not.toHaveBeenCalled();
    });

    it('resets stale Failure state by calling dispatchClosed', () => {
      setupMocks({ status: 'Failure' });

      renderHook(() => useDustDesignationSheet(mockProps));

      // dispatchClosed should be called to reset the terminal state
      expect(mockDispatchClosed).toHaveBeenCalledTimes(1);
      expect(mockDispatchOpenRequested).not.toHaveBeenCalled();
      expect(mockDispatchConfirm).not.toHaveBeenCalled();
    });

    it('initializes flow when status is DiscardingTx', () => {
      setupMocks({ status: 'DiscardingTx' });

      renderHook(() => useDustDesignationSheet(mockProps));

      // dispatchOpenRequested should be called to initialize the flow
      expect(mockDispatchOpenRequested).toHaveBeenCalledTimes(1);
      expect(mockDispatchOpenRequested).toHaveBeenCalledWith({
        accountId: mockAccountId,
        blockchainSpecificData: { flowType: 'dust-designation' },
        initialAddress: mockOwnDustAddress,
        initialAmount: mockNightToken.available,
        initialSelectedToken: mockNightToken,
      });
      expect(mockDispatchClosed).not.toHaveBeenCalled();
      expect(mockDispatchConfirm).not.toHaveBeenCalled();
    });

    it('does not dispatch any actions when status is Processing', () => {
      setupMocks({ status: 'Processing' });

      renderHook(() => useDustDesignationSheet(mockProps));

      // No initialization or reset actions for Processing state
      expect(mockDispatchClosed).not.toHaveBeenCalled();
      expect(mockDispatchOpenRequested).not.toHaveBeenCalled();
      expect(mockDispatchConfirm).not.toHaveBeenCalled();
    });
  });
});
