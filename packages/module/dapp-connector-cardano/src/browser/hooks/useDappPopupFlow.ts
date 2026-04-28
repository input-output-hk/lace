import { onSheetClose } from '@lace-lib/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../common/hooks';

import type {
  PendingSignDataRequest,
  PendingSignTxRequest,
} from '../../common/store/slice';

type RequestSelectorMap = {
  signTx: 'cardanoDappConnector.selectPendingSignTxRequest';
  signData: 'cardanoDappConnector.selectPendingSignDataRequest';
};

type ActionMap = {
  signTx: {
    confirm: 'cardanoDappConnector.confirmSignTx';
    reject: 'cardanoDappConnector.rejectSignTx';
  };
  signData: {
    confirm: 'cardanoDappConnector.confirmSignData';
    reject: 'cardanoDappConnector.rejectSignData';
  };
};

type RequestDataMap = {
  signTx: PendingSignTxRequest;
  signData: PendingSignDataRequest;
};

const REQUEST_SELECTORS: RequestSelectorMap = {
  signTx: 'cardanoDappConnector.selectPendingSignTxRequest',
  signData: 'cardanoDappConnector.selectPendingSignDataRequest',
};

/**
 * Completion selector mapping for signTx and signData flows.
 * These selectors return true when the signing operation completed successfully.
 */
type CompletionSelectorMap = {
  signTx: 'cardanoDappConnector.selectSignTxCompleted';
  signData: 'cardanoDappConnector.selectSignDataCompleted';
};

const COMPLETION_SELECTORS: CompletionSelectorMap = {
  signTx: 'cardanoDappConnector.selectSignTxCompleted',
  signData: 'cardanoDappConnector.selectSignDataCompleted',
};

/**
 * Error selector mapping for signTx and signData flows.
 * These selectors return true when signing failed with a non-cancellation error.
 */
type ErrorSelectorMap = {
  signTx: 'cardanoDappConnector.selectSignTxError';
  signData: 'cardanoDappConnector.selectSignDataError';
};

const ERROR_SELECTORS: ErrorSelectorMap = {
  signTx: 'cardanoDappConnector.selectSignTxError',
  signData: 'cardanoDappConnector.selectSignDataError',
};

const ACTION_KEYS: ActionMap = {
  signTx: {
    confirm: 'cardanoDappConnector.confirmSignTx',
    reject: 'cardanoDappConnector.rejectSignTx',
  },
  signData: {
    confirm: 'cardanoDappConnector.confirmSignData',
    reject: 'cardanoDappConnector.rejectSignData',
  },
};

/**
 * Return type for useDappPopupFlow hook with proper type narrowing.
 *
 * When `request` is `null`, the hook is in loading state (`isLoading: true`).
 * When `request` is present, the request data is available and loading is complete.
 */
type DappPopupFlowResult<T extends 'signData' | 'signTx'> =
  | {
      request: null;
      isLoading: true;
      isComplete: boolean;
      isError: boolean;
      handleConfirm: () => void;
      handleReject: () => void;
    }
  | {
      request: RequestDataMap[T];
      isLoading: false;
      isComplete: false;
      isError: false;
      handleConfirm: () => void;
      handleReject: () => void;
    };

/**
 * Configuration options for the useDappPopupFlow hook.
 */
interface UseDappPopupFlowOptions<T extends 'signData' | 'signTx'> {
  /**
   * The type of signing request to manage.
   * Currently supports 'signTx' for transaction signing and 'signData' for CIP-8 data signing.
   */
  type: T;

  /**
   * Optional callback invoked immediately after the confirm action is dispatched.
   * Useful for analytics tracking or additional side effects.
   */
  onConfirm?: () => void;

  /**
   * Optional callback invoked immediately after the reject action is dispatched.
   * Useful for analytics tracking or additional side effects.
   */
  onReject?: () => void;

  /**
   * When true, disables auto-close behavior and returns `isComplete: true` when
   * the signing operation completes successfully after user confirmation.
   *
   * The component is then responsible for:
   * 1. Rendering a success screen when `isComplete` is true
   * 2. Calling `window.close()` when the user dismisses the success screen
   *
   * @default false
   */
}

/**
 * Browser extension popup flow management hook for dApp signing operations.
 *
 * This hook provides complete state management for dApp signing popup windows in the
 * browser extension. It is NOT intended for mobile platforms, which use their own
 * sheet-based navigation flow.
 *
 * The hook manages the following flow:
 * 1. Loads the current signing request from Redux state
 * 2. Provides memoized confirm/reject handlers that dispatch the appropriate actions
 *
 * @typeParam T - The type of signing request, either 'signTx' or 'signData'
 * @param options - Configuration options for the hook
 * @returns An object containing the request data, loading/completion states, and action handlers
 */
export const useDappPopupFlow = <T extends 'signData' | 'signTx'>({
  type,
  onConfirm,
  onReject,
}: UseDappPopupFlowOptions<T>): DappPopupFlowResult<T> => {
  const request = useLaceSelector(REQUEST_SELECTORS[type]) as
    | RequestDataMap[T]
    | null;

  const isSigningCompleted = useLaceSelector(COMPLETION_SELECTORS[type]);
  const isSigningError = useLaceSelector(ERROR_SELECTORS[type]);

  const dispatchConfirm = useDispatchLaceAction(
    ACTION_KEYS[type].confirm,
    true,
  );
  const dispatchReject = useDispatchLaceAction(ACTION_KEYS[type].reject, true);

  const hasRespondedRef = useRef(false);

  const handleConfirm = useCallback(() => {
    hasRespondedRef.current = true;
    dispatchConfirm();
    onConfirm?.();
  }, [dispatchConfirm, onConfirm]);

  const handleReject = useCallback(() => {
    hasRespondedRef.current = true;
    dispatchReject();
    onReject?.();
  }, [dispatchReject, onReject]);

  // Reject when sheet is dismissed (X button, swipe down, click outside).
  // The sheet host uses reset() which doesn't fire blur/beforeRemove events,
  // so we listen for the onSheetClose callback from SheetControls.close().
  useEffect(() => {
    return onSheetClose(() => {
      if (!hasRespondedRef.current && request) {
        dispatchReject();
        onReject?.();
      }
    });
  }, [dispatchReject, onReject, request]);

  const hadRequest = useRef(false);
  if (request) {
    hadRequest.current = true;
  }

  if (!request) {
    return {
      request: null,
      isLoading: true,
      isComplete: hadRequest.current && isSigningCompleted,
      isError: hadRequest.current && isSigningError,
      handleConfirm,
      handleReject,
    };
  }

  return {
    request,
    isLoading: false,
    isComplete: false,
    isError: false,
    handleConfirm,
    handleReject,
  };
};
