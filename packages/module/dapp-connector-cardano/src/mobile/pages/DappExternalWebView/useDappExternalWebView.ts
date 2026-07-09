import { CustomDappId, normalizeUrlForId } from '@lace-contract/custom-dapps';
import { useTranslation } from '@lace-contract/i18n';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../../common/hooks';
import {
  useDappConnectorBridge,
  type DappConnectorBridgeResult,
} from '../../hooks';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';
import type {
  WebViewNavBarFavorite,
  WebViewTemplateProps,
} from '@lace-lib/ui-toolkit';

/**
 * Props returned by the useDappExternalWebView hook.
 */
export interface DappExternalWebViewProps extends WebViewTemplateProps {
  isAuthorizationPending: boolean;
  setInjectJavaScript: DappConnectorBridgeResult['setInjectJavaScript'];
  dappOrigin: string;
  favorite?: WebViewNavBarFavorite;
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
  const { t } = useTranslation();
  const params = props.route.params;
  const dappUrl = params.buttonUrl;
  const canFavorite = params.canFavorite !== false;

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

  const isSaved = useLaceSelector('customDapps.selectIsUrlSaved', dappUrl);
  const addCustomDapp = useDispatchLaceAction('customDapps.addCustomDapp');
  const removeCustomDapp = useDispatchLaceAction(
    'customDapps.removeCustomDapp',
  );
  const showToast = useDispatchLaceAction('ui.showToast');

  const onToggleFavorite = useCallback(() => {
    void Haptics.selectionAsync();
    if (isSaved) {
      removeCustomDapp(CustomDappId(normalizeUrlForId(dappUrl)));
      showToast({
        text: String(t('v2.webview.toast.removed')),
        position: 'bottom',
      });
    } else {
      addCustomDapp({ url: dappUrl });
      showToast({
        text: String(t('v2.webview.toast.saved')),
        position: 'bottom',
      });
    }
  }, [isSaved, dappUrl, addCustomDapp, removeCustomDapp, showToast, t]);

  const favorite = useMemo<WebViewNavBarFavorite | undefined>(
    () =>
      canFavorite
        ? {
            isSaved,
            onToggle: onToggleFavorite,
            accessibilityLabel: String(
              t(
                isSaved
                  ? 'v2.webview.favourite.accessibility-label.remove'
                  : 'v2.webview.favourite.accessibility-label.save',
              ),
            ),
          }
        : undefined,
    [canFavorite, isSaved, onToggleFavorite, t],
  );

  return {
    url: dappUrl,
    errorMessage: 'Error loading dApp',
    forceNativeRender: true,
    debugMode: __DEV__,

    ...webViewProps,

    isAuthorizationPending,
    setInjectJavaScript,
    dappOrigin,
    favorite,
  };
};
