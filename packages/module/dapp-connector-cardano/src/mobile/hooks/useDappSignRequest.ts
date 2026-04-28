import { NavigationControls } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APIErrorCode } from '../../common/api-error';

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

const mapResponse = (response: WebViewResponse): DappSignResult => {
  if (response.success) {
    return { state: 'success' };
  }
  const error = response.error;
  const state: DappSignResultState =
    error?.code === APIErrorCode.Refused ? 'rejected' : 'failure';
  return {
    state,
    error: error
      ? { message: error.info, code: String(error.code) }
      : undefined,
  };
};

export const useDappSignRequest = ({
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
    return mapResponse(response);
  }, [webViewResponseQueue, requestId]);

  const handleConfirm = useCallback(() => {
    hasRespondedRef.current = true;
    setIsSigning(true);
    dispatchConfirm();
  }, [dispatchConfirm]);

  const handleReject = useCallback(() => {
    hasRespondedRef.current = true;
    dispatchReject();
    NavigationControls.sheets.close();
  }, [dispatchReject]);

  const handleCloseResult = useCallback(() => {
    dispatchClearWebViewResponse(requestId);
    dispatchClearPendingRequest();
    NavigationControls.sheets.close();
  }, [dispatchClearWebViewResponse, dispatchClearPendingRequest, requestId]);

  useEffect(() => {
    if (result) {
      setIsSigning(false);
    }
  }, [result]);

  useEffect(() => {
    if (!pendingRequest && !requestId && !result) {
      NavigationControls.sheets.close();
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
