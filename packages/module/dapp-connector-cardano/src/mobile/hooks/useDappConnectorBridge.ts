import { useDeepCompareMemo } from '@lace-lib/util-render';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useLaceSelector, useDispatchLaceAction } from '../../common/hooks';
import { safeParseUrl } from '../../common/utils/url-utils';
import {
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

/**
 * A pending request's document nonce plus when the entry may be discarded. The
 * expiry bounds the map: a request whose response never arrives (client-side
 * timeout, ignored type) cannot leak for the document's whole lifetime.
 */
type PendingNonce = { nonce: string; expiresAt: number };

// Extra grace over the request timeout before a pending nonce is prunable, so a
// response that lands just after the runtime's timeout (network lag, clock skew)
// but before Redux delivers it here still finds its nonce.
const PENDING_NONCE_TTL_MARGIN_MS = 5000;

const prunePendingNonces = (
  pending: Map<string, PendingNonce>,
  now: number,
): void => {
  for (const [id, entry] of pending) {
    if (entry.expiresAt <= now) pending.delete(id);
  }
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
    | 'onLoadStart'
    | 'onMessage'
  >;
  setInjectJavaScript: (injectJavaScript: (script: string) => void) => void;
  isAuthorizationPending: boolean;
  /**
   * Hostname shown in the nav bar, taken from the live document's own asserted
   * origin (display only — never used for authorization).
   */
  currentHostname: string;
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

  // Per-instance capability token. Only the main-frame runtime we inject learns
  // it (injection is main-frame-only and the token lives in the runtime's
  // closure), so a cross-origin subframe cannot forge a message the bridge
  // accepts. useRef, not useMemo: React may discard a useMemo cache at will, and
  // a regenerated token would no longer match the one already baked into the
  // loaded document's runtime, so every message that runtime sends would be
  // silently rejected. Must stay stable for the mount.
  const bridgeTokenRef = useRef<string | undefined>(undefined);
  const bridgeToken = (bridgeTokenRef.current ??= uuidv4());

  // Hostname shown in the nav bar. Display ONLY, never authorization. Updated
  // from the live document's own asserted origin when it messages the wallet (see
  // onMessage) — not from navigation events, which also fire on failed loads and
  // would show a URL that never became the live document. Seeded with the launch.
  const [currentHostname, setCurrentHostname] = useState(
    () => safeParseUrl(dappOrigin).hostname,
  );

  // Document nonce per in-flight request, kept only here (never in Redux): set
  // when a token-valid message arrives, consulted when its response is injected
  // so a witness is bound to the exact document that requested it.
  const pendingNoncesRef = useRef<Map<string, PendingNonce>>(new Map());

  // Deep-compare the caller config so a fresh `{ debug }` literal each render
  // does not rebuild the large runtime string; rebuild only when the token or
  // the config's content actually changes.
  const stableInjectionConfig = useDeepCompareMemo(injectionConfig);
  const requestTimeout =
    stableInjectionConfig?.requestTimeout ?? defaultConfig.requestTimeout;
  const injectionScript = useMemo(
    () =>
      createInjectionScript({
        ...defaultConfig,
        ...stableInjectionConfig,
        bridgeToken,
      }),
    [bridgeToken, stableInjectionConfig],
  );

  const setInjectJavaScript = useCallback(
    (injectJavaScript: (script: string) => void) => {
      injectRef.current = injectJavaScript;
    },
    [],
  );

  const sendResponseToWebView = useCallback(
    (response: Omit<WebViewResponse, 'timestamp'>) => {
      // Stamp the response with the nonce of the document that made the request.
      // No entry means the request is unknown, already answered, or its document
      // navigated away (onLoadStart cleared the map) — drop. Dropping on the
      // NATIVE side is essential: the runtime's nonce check runs inside
      // window.laceCip30Response, which a document that has since loaded can
      // replace, so it cannot be trusted to reject a witness meant for an earlier
      // document. The nonce echo only hardens the honest-runtime case.
      const pending = pendingNoncesRef.current.get(response.id);
      if (pending === undefined) return;
      pendingNoncesRef.current.delete(response.id);

      const script = `
      if (window.laceCip30Response) {
        window.laceCip30Response(${JSON.stringify({
          ...response,
          nonce: pending.nonce,
        })});
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

  const onLoadStart = useCallback(() => {
    // A new main-frame document is loading. Drop every pending nonce so a witness
    // approved for the previous document is never injected into the new one. This
    // native-side drop is the real cross-document guard: the runtime's nonce check
    // lives in window.laceCip30Response, which the newly loaded (possibly hostile)
    // document can replace, so it cannot be relied on to reject a stale witness.
    pendingNoncesRef.current.clear();
  }, []);

  const onMessage = useCallback(
    (data: string) => {
      try {
        const parsed: unknown = JSON.parse(data);

        if (!isWebViewMessage(parsed)) {
          return;
        }

        const { token, nonce, origin, ...message } =
          parsed as WebViewMessage & {
            token?: unknown;
            nonce?: unknown;
            origin?: unknown;
          };

        // Defense A: reject anything without our per-instance token as a
        // non-empty exact match. The string+length checks also stop a degenerate
        // (empty) token from ever becoming a wildcard.
        if (
          typeof token !== 'string' ||
          token.length === 0 ||
          token !== bridgeToken
        ) {
          return;
        }

        // Defense B: a token-valid message must carry its document nonce, so the
        // response can be bound to the requesting document (see
        // sendResponseToWebView).
        if (typeof nonce !== 'string' || nonce.length === 0) {
          return;
        }

        // Defense C: attribute the request to the origin the runtime stamped on
        // it. Injection is main-frame-only and the token is secret to that
        // runtime, so a token-valid message's origin is the genuine origin of the
        // document that sent it — no subframe or page script can forge it. The
        // origin travels with the message, so attribution never races against
        // native navigation events.
        if (typeof origin !== 'string' || origin.length === 0) {
          return;
        }

        // Nav bar follows the live document's own asserted origin. Trustworthy
        // (token-gated, main-frame-only, forge-proof send path) and immune to the
        // failed-navigation events that a native onLoadEnd would report.
        setCurrentHostname(safeParseUrl(origin).hostname);

        const now = Date.now();
        prunePendingNonces(pendingNoncesRef.current, now);
        pendingNoncesRef.current.set(message.id, {
          nonce,
          expiresAt: now + requestTimeout + PENDING_NONCE_TTL_MARGIN_MS,
        });

        dispatchReceiveWebViewMessage({
          message,
          dappOrigin: origin,
          timestamp: now,
        });
      } catch {}
    },
    [bridgeToken, requestTimeout, dispatchReceiveWebViewMessage],
  );

  return {
    webViewProps: {
      injectedJavaScriptBeforeContentLoaded: injectionScript,
      onLoadStart,
      onMessage,
      onInjectJavaScriptReady: setInjectJavaScript,
    },
    setInjectJavaScript,
    isAuthorizationPending: !!pendingAuthRequest,
    currentHostname,
  };
};

export type { WalletRequest, WalletResponse };
