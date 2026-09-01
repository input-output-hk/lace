import { NavigationControls } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  APIErrorCode,
  DataSignErrorCode,
  TxSignErrorCode,
} from '../../common/api-error';

import type { WebViewResponse } from '../../common/store';

export type DappSignResultState = 'failure' | 'rejected' | 'success';

export interface DappSignErrorDetails {
  message?: string;
  code?: string;
}

export interface DappSignResult {
  state: DappSignResultState;
  error?: DappSignErrorDetails;
}

export interface UseDappSignRequestConfig {
  /** Selects which CIP-30 UserDeclined code marks a response as 'rejected'. */
  signingType: 'signData' | 'signTx';
  requestId: string;
  pendingRequest: unknown;
  webViewResponseQueue: WebViewResponse[];
  dispatchConfirm: () => void;
  dispatchReject: () => void;
  dispatchClearPendingRequest: () => void;
  dispatchClearWebViewResponse: (requestId: string) => void;
}

export interface UseDappSignRequestResult {
  handleConfirm: () => void;
  handleReject: () => void;
  handleCloseResult: () => void;
  isLoading: boolean;
  isSigning: boolean;
  result: DappSignResult | null;
}

const mapResponse = (
  response: WebViewResponse,
  signingType: 'signData' | 'signTx',
): DappSignResult => {
  if (response.success) {
    return { state: 'success' };
  }
  const error = response.error;
  // A user decline is DataSignError 3 / TxSignError 2; APIError -3 is kept
  // for responses produced before the CIP-30 code alignment.
  const declinedCode =
    signingType === 'signData'
      ? DataSignErrorCode.UserDeclined
      : TxSignErrorCode.UserDeclined;
  const state: DappSignResultState =
    error?.code === declinedCode || error?.code === APIErrorCode.Refused
      ? 'rejected'
      : 'failure';
  return {
    state,
    error: error
      ? { message: error.info, code: String(error.code) }
      : undefined,
  };
};

export const useDappSignRequest = ({
  signingType,
  requestId,
  pendingRequest,
  webViewResponseQueue,
  dispatchConfirm,
  dispatchReject,
  dispatchClearPendingRequest,
  dispatchClearWebViewResponse,
}: UseDappSignRequestConfig): UseDappSignRequestResult => {
  const hasRespondedRef = useRef(false);
  const [isSigning, setIsSigning] = useState(false);

  const result = useMemo((): DappSignResult | null => {
    const response = webViewResponseQueue?.find(r => r.id === requestId);
    if (!response) return null;
    return mapResponse(response, signingType);
  }, [webViewResponseQueue, requestId, signingType]);

  const handleConfirm = useCallback(() => {
    hasRespondedRef.current = true;
    setIsSigning(true);
    dispatchConfirm();
  }, [dispatchConfirm]);

  const handleReject = useCallback(() => {
    hasRespondedRef.current = true;
    dispatchReject();
    NavigationControls.closeSheet();
  }, [dispatchReject]);

  const handleCloseResult = useCallback(() => {
    dispatchClearWebViewResponse(requestId);
    dispatchClearPendingRequest();
    NavigationControls.closeSheet();
  }, [dispatchClearWebViewResponse, dispatchClearPendingRequest, requestId]);

  useEffect(() => {
    if (result) {
      setIsSigning(false);
    }
  }, [result]);

  useEffect(() => {
    if (!pendingRequest && !requestId && !result) {
      NavigationControls.closeSheet();
    }
  }, [pendingRequest, requestId, result]);

  useEffect(() => {
    return () => {
      if (!hasRespondedRef.current && pendingRequest) {
        dispatchReject();
      }
    };
  }, [dispatchReject, pendingRequest]);

  const isLoading = !pendingRequest && !requestId;

  return {
    handleConfirm,
    handleReject,
    handleCloseResult,
    isLoading,
    isSigning,
    result,
  };
};
