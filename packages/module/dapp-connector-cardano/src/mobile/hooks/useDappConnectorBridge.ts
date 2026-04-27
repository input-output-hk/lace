import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useLaceSelector, useDispatchLaceAction } from '../../common/hooks';
import {
  CIP30_INJECTION_SCRIPT,
  createInjectionScript,
  defaultConfig,
  type InjectionScriptConfig,
  type WalletRequest,
  type WalletResponse,
} from '../injection';

import type { WebViewMessage, WebViewResponse } from '../../common/store/slice';
import type { WebViewTemplateProps } from '@lace-lib/ui-toolkit';

const isWebViewMessage = (value: unknown): value is WebViewMessage => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    v.source === 'lace-cip30'
  );
};

type ProcessResponseParams = {
  response: WebViewResponse;
  processedIds: Set<string>;
  /** Request IDs to keep in queue so SignTx/SignData UI can show result; cleared when user closes */
  keepInQueueRequestIds: Set<string>;
  sendResponse: (r: Omit<WebViewResponse, 'timestamp'>) => void;
  clearResponse: (id: string) => void;
};

const processResponse = ({
  response,
  processedIds,
  keepInQueueRequestIds,
  sendResponse,
  clearResponse,
}: ProcessResponseParams): void => {
  if (processedIds.has(response.id)) return;

  processedIds.add(response.id);
  sendResponse({
    id: response.id,
    success: response.success,
    result: response.result,
    error: response.error,
  });
  // Keep sign-tx/sign-data response in queue so UI can show result; cleared when user closes result
  if (!keepInQueueRequestIds.has(response.id)) {
    clearResponse(response.id);
  }
};

const cleanupProcessedIds = (
  processedIds: Set<string>,
  currentQueueIds: Set<string>,
): void => {
  for (const id of processedIds) {
    if (!currentQueueIds.has(id)) {
      processedIds.delete(id);
    }
  }
};

/**
 * Props for the useDappConnectorBridge hook.
 *
 * @property dappOrigin - The origin URL of the dApp (e.g., 'https://app.example.com').
 *   Used to identify the dApp in authorization flows.
 * @property injectionConfig - Optional configuration for the CIP-30 injection script.
 *   Allows customizing wallet metadata, timeout settings, and debug mode.
 */
export interface UseDappConnectorBridgeProps {
  dappOrigin: string;
  injectionConfig?: Partial<InjectionScriptConfig>;
}

/**
 * Return type for the useDappConnectorBridge hook.
 *
 * @property webViewProps - Props to spread onto the WebViewTemplate component:
 *   - `injectedJavaScriptBeforeContentLoaded`: The CIP-30 injection script
 *   - `onMessage`: Handler for WebView messages
 *   - `onInjectJavaScriptReady`: Callback when JavaScript injection is ready
 * @property setInjectJavaScript - Function to set the WebView's injectJavaScript method.
 *   Call this with the WebView ref's injectJavaScript function.
 * @property isAuthorizationPending - True when a dApp authorization request is pending user response.
 */
export interface DappConnectorBridgeResult {
  webViewProps: Pick<
    WebViewTemplateProps,
    | 'injectedJavaScriptBeforeContentLoaded'
    | 'onInjectJavaScriptReady'
    | 'onMessage'
  >;
  setInjectJavaScript: (injectJavaScript: (script: string) => void) => void;
  isAuthorizationPending: boolean;
}

/**
 * Hook that bridges the WebView dApp connector to the wallet.
 *
 * This hook is a **thin bridge** that:
 * 1. Provides the CIP-30 injection script for the WebView
 * 2. Parses messages from the WebView via onMessage
 * 3. Dispatches actions to Redux (message handling done by side effects)
 * 4. Listens for responses from Redux and sends them to WebView
 *
 * The actual CIP-30 API logic is handled by side effects in `side-effects-mobile.ts`.
 *
 * @param props - Hook configuration props
 * @param props.dappOrigin - The origin URL of the dApp
 * @param props.injectionConfig - Optional injection script configuration
 * @returns Bridge result containing WebView props and authorization handlers
 */
export const useDappConnectorBridge = ({
  dappOrigin,
  injectionConfig,
}: UseDappConnectorBridgeProps): DappConnectorBridgeResult => {
  const pendingAuthRequest = useLaceSelector(
    'cardanoDappConnector.selectPendingAuthRequest',
  );

  const pendingSignTxRequest = useLaceSelector(
    'cardanoDappConnector.selectPendingSignTxRequest',
  );

  const pendingSignDataRequest = useLaceSelector(
    'cardanoDappConnector.selectPendingSignDataRequest',
  );

  const webViewResponseQueue = useLaceSelector(
    'cardanoDappConnector.selectWebViewResponseQueue',
  );

  const dispatchReceiveWebViewMessage = useDispatchLaceAction(
    'cardanoDappConnector.receiveWebViewMessage',
  );

  const dispatchClearWebViewResponse = useDispatchLaceAction(
    'cardanoDappConnector.clearWebViewResponse',
  );

  const injectRef = useRef<((script: string) => void) | null>(null);
  const processedResponseIdsRef = useRef<Set<string>>(new Set());

  const injectionScript = injectionConfig
    ? createInjectionScript({ ...defaultConfig, ...injectionConfig })
    : CIP30_INJECTION_SCRIPT;

  const setInjectJavaScript = useCallback(
    (injectJavaScript: (script: string) => void) => {
      injectRef.current = injectJavaScript;
    },
    [],
  );

  const sendResponseToWebView = useCallback(
    (response: Omit<WebViewResponse, 'timestamp'>) => {
      const script = `
      if (window.laceCip30Response) {
        window.laceCip30Response(${JSON.stringify(response)});
      }
      true;
    `;
      injectRef.current?.(script);
    },
    [],
  );

  const keepInQueueRequestIds = useMemo(
    () =>
      new Set(
        [
          pendingSignTxRequest?.requestId,
          pendingSignDataRequest?.requestId,
        ].filter((id): id is string => typeof id === 'string'),
      ),
    [pendingSignTxRequest?.requestId, pendingSignDataRequest?.requestId],
  );

  useEffect(() => {
    if (!webViewResponseQueue || webViewResponseQueue.length === 0) return;

    for (const response of webViewResponseQueue) {
      processResponse({
        response,
        processedIds: processedResponseIdsRef.current,
        keepInQueueRequestIds,
        sendResponse: sendResponseToWebView,
        clearResponse: dispatchClearWebViewResponse,
      });
    }

    const queueIds = new Set(webViewResponseQueue.map(r => r.id));
    cleanupProcessedIds(processedResponseIdsRef.current, queueIds);
  }, [
    webViewResponseQueue,
    keepInQueueRequestIds,
    sendResponseToWebView,
    dispatchClearWebViewResponse,
  ]);

  const onMessage = useCallback(
    (data: string) => {
      try {
        const parsed: unknown = JSON.parse(data);

        if (!isWebViewMessage(parsed)) {
          return;
        }

        dispatchReceiveWebViewMessage({
          message: parsed,
          dappOrigin,
          timestamp: Date.now(),
        });
      } catch {}
    },
    [dappOrigin, dispatchReceiveWebViewMessage],
  );

  return {
    webViewProps: {
      injectedJavaScriptBeforeContentLoaded: injectionScript,
      onMessage,
      onInjectJavaScriptReady: setInjectJavaScript,
    },
    setInjectJavaScript,
    isAuthorizationPending: !!pendingAuthRequest,
  };
};

export type { WalletRequest, WalletResponse };
