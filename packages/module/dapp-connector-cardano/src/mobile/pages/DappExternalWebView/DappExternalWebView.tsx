import { WebViewTemplate } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

import { useDappExternalWebView } from './useDappExternalWebView';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

/**
 * Stack screen component that displays external dApp content in a WebView.
 *
 * @param props - Stack screen props containing route params with dApp URL
 * @returns React element wrapping WebViewTemplate with dApp connector integration
 */
export const DappExternalWebView = (
  props: StackScreenProps<StackRoutes.DappExternalWebView>,
) => {
  const { dappOrigin, ...templateProps } = useDappExternalWebView(props);

  let displayUrl = '';
  try {
    displayUrl = new URL(dappOrigin).hostname;
  } catch {
    displayUrl = dappOrigin;
  }

  const handleDone = useCallback(() => {
    props.navigation.goBack();
  }, [props.navigation]);

  return (
    <WebViewTemplate
      {...templateProps}
      navBar={{ displayUrl, onDone: handleDone }}
    />
  );
};
