import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import type { WebViewProps as RNWebViewProps } from 'react-native-webview';
import type { WebView as RNWebViewType } from 'react-native-webview';

export const WebView = forwardRef<RNWebViewType, RNWebViewProps>(
  ({ style, ...rest }, ref) => {
    return <RNWebView ref={ref} style={[styles.webView, style]} {...rest} />;
  },
);

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    //marginTop: Constants.statusBarHeight,
  },
});
