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

  const dispatchConfirm = useDispatchLaceAction(ACTION_KEYS[type].confirm);
  const dispatchReject = useDispatchLaceAction(ACTION_KEYS[type].reject);

  // A ref, not `request.requestId`: the handlers memoize on a dispatcher that
  // never changes identity, so a closure would freeze the first request's id —
  // and the unmount reject fires once the request has already been cleared.
  const requestIdRef = useRef<string | undefined>(undefined);
  const hasRespondedRef = useRef(false);

  // A queued request inherits this view without a remount (the popup document
  // survives; the sheet route only gets new params), so a flag left set by the
  // previous answer would make this request's dismissal settle nothing.
  if (request && requestIdRef.current !== request.requestId) {
    requestIdRef.current = request.requestId;
    hasRespondedRef.current = false;
  }

  const handleConfirm = useCallback(() => {
    hasRespondedRef.current = true;
    dispatchConfirm({ requestId: requestIdRef.current });
    onConfirm?.();
  }, [dispatchConfirm, onConfirm]);

  const handleReject = useCallback(() => {
    hasRespondedRef.current = true;
    dispatchReject({ requestId: requestIdRef.current });
    onReject?.();
  }, [dispatchReject, onReject]);

  // Reject on any unhandled dismissal (X button, swipe down, click outside,
  // navigation away). On web/extension, gorhom's BottomSheetModal unmounts
  // children before React Navigation processes REMOVE, so the previously
  // registered onSheetClose listener was already gone by the time the
  // navigation state event fired. The unmount cleanup is the only signal
  // that reliably runs on every dismissal path. Hold the latest dispatcher
  // in a ref so the effect can be unmount-only without going stale.
  const dispatchRejectRef = useRef(dispatchReject);
  dispatchRejectRef.current = dispatchReject;
  const onRejectRef = useRef(onReject);
  onRejectRef.current = onReject;
  useEffect(() => {
    return () => {
      if (!hasRespondedRef.current) {
        dispatchRejectRef.current({ requestId: requestIdRef.current });
        onRejectRef.current?.();
      }
    };
  }, []);

  const hadRequest = useRef(false);
  if (request) {
    hadRequest.current = true;
  }

  if (!request) {
    return {
      request: null,
      isLoading: true,
      isComplete: hadRequest.current && isSigningCompleted,
      // Not gated on hadRequest, unlike isComplete: a port drop can settle the
      // request into an error before this popup has synced state even once,
      // and gating on a request this instance never saw left it rendering the
      // loading state forever. A stale flag cannot leak in — setting a pending
      // request clears signTxError/signDataError in the same reducer.
      isError: isSigningError,
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
