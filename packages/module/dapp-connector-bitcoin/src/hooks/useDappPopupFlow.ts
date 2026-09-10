import { useCallback, useEffect, useRef } from 'react';

import { useDispatchLaceAction, useLaceSelector } from './storeHooks';

import type {
  PendingSignMessageRequest,
  PendingSignPsbtRequest,
} from '../store/slice';

type RequestSelectorMap = {
  signMessage: 'bitcoinDappConnector.selectPendingSignMessageRequest';
  signPsbt: 'bitcoinDappConnector.selectPendingSignPsbtRequest';
};

const REQUEST_SELECTORS: RequestSelectorMap = {
  signMessage: 'bitcoinDappConnector.selectPendingSignMessageRequest',
  signPsbt: 'bitcoinDappConnector.selectPendingSignPsbtRequest',
};

type RequestDataMap = {
  signMessage: PendingSignMessageRequest;
  signPsbt: PendingSignPsbtRequest;
};

type CompletionSelectorMap = {
  signMessage: 'bitcoinDappConnector.selectSignMessageCompleted';
  signPsbt: 'bitcoinDappConnector.selectSignPsbtCompleted';
};

const COMPLETION_SELECTORS: CompletionSelectorMap = {
  signMessage: 'bitcoinDappConnector.selectSignMessageCompleted',
  signPsbt: 'bitcoinDappConnector.selectSignPsbtCompleted',
};

type ErrorSelectorMap = {
  signMessage: 'bitcoinDappConnector.selectSignMessageError';
  signPsbt: 'bitcoinDappConnector.selectSignPsbtError';
};

const ERROR_SELECTORS: ErrorSelectorMap = {
  signMessage: 'bitcoinDappConnector.selectSignMessageError',
  signPsbt: 'bitcoinDappConnector.selectSignPsbtError',
};

type ActionMap = {
  signMessage: {
    confirm: 'bitcoinDappConnector.confirmSignMessage';
    reject: 'bitcoinDappConnector.rejectSignMessage';
  };
  signPsbt: {
    confirm: 'bitcoinDappConnector.confirmSignPsbt';
    reject: 'bitcoinDappConnector.rejectSignPsbt';
  };
};

const ACTION_KEYS: ActionMap = {
  signMessage: {
    confirm: 'bitcoinDappConnector.confirmSignMessage',
    reject: 'bitcoinDappConnector.rejectSignMessage',
  },
  signPsbt: {
    confirm: 'bitcoinDappConnector.confirmSignPsbt',
    reject: 'bitcoinDappConnector.rejectSignPsbt',
  },
};

/**
 * Return type for useDappPopupFlow, with request narrowing tied to loading
 * state: `request` is null only while `isLoading` is true.
 */
type DappPopupFlowResult<T extends 'signMessage' | 'signPsbt'> =
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

interface UseDappPopupFlowOptions<T extends 'signMessage' | 'signPsbt'> {
  /** Which review flow this screen manages. */
  type: T;
  /** Called right after the confirm action is dispatched. */
  onConfirm?: () => void;
  /** Called right after the reject action is dispatched. */
  onReject?: () => void;
}

/**
 * Review flow management hook for the Bitcoin dApp sign screens (signMessage
 * and signPsbt), shared by the popup window and the side panel sheet.
 *
 * Loads the pending request from Redux state and provides memoized
 * confirm/reject handlers that dispatch the matching slice actions.
 *
 * @typeParam T - The type of signing request, either 'signMessage' or 'signPsbt'
 * @param options - Configuration options for the hook
 * @returns The request data, loading/completion state, and action handlers
 */
export const useDappPopupFlow = <T extends 'signMessage' | 'signPsbt'>({
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

  // Reject on any unhandled dismissal (close X, swipe down, click outside,
  // navigation away). On web the bottom sheet unmounts its children before
  // React Navigation processes the removal, so a navigation listener is already
  // gone by then: the unmount cleanup is the only signal that runs on every
  // dismissal path. Hold the latest dispatcher in a ref so the effect can stay
  // unmount-only without going stale.
  const dispatchRejectRef = useRef(dispatchReject);
  dispatchRejectRef.current = dispatchReject;
  const onRejectRef = useRef(onReject);
  onRejectRef.current = onReject;
  useEffect(() => {
    return () => {
      if (!hasRespondedRef.current) {
        dispatchRejectRef.current();
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
