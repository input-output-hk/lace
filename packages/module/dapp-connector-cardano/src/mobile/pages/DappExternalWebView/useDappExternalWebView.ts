import {
  useDappConnectorBridge,
  type DappConnectorBridgeResult,
} from '../../hooks';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';
import type { WebViewTemplateProps } from '@lace-lib/ui-toolkit';

/**
 * Props returned by the useDappExternalWebView hook.
 */
export interface DappExternalWebViewProps extends WebViewTemplateProps {
  isAuthorizationPending: boolean;
  setInjectJavaScript: DappConnectorBridgeResult['setInjectJavaScript'];
  dappOrigin: string;
}

/**
 * Hook that configures the DApp External WebView with CIP-30 wallet support.
 *
 * This hook:
 * 1. Gets the dApp URL from navigation params
 * 2. Sets up the CIP-30 injection script via useDappConnectorBridge
 * 3. Handles message communication between WebView and wallet
 * 4. Uses Redux selectors to access wallet state
 * 5. Dispatches Redux actions for authorization and signing flows
 *
 */
export const useDappExternalWebView = (
  props: StackScreenProps<StackRoutes.DappExternalWebView>,
): DappExternalWebViewProps => {
  const params = props.route.params;
  const dappUrl = params.buttonUrl;

  let dappOrigin = '';
  try {
    dappOrigin = new URL(dappUrl).origin;
  } catch {
    dappOrigin = dappUrl;
  }

  const { webViewProps, setInjectJavaScript, isAuthorizationPending } =
    useDappConnectorBridge({
      dappOrigin,
      injectionConfig: {
        debug: __DEV__,
      },
    });

  return {
    url: dappUrl,
    errorMessage: 'Error loading dApp',
    forceNativeRender: true,
    debugMode: __DEV__,

    ...webViewProps,

    isAuthorizationPending,
    setInjectJavaScript,
    dappOrigin,
  };
};
