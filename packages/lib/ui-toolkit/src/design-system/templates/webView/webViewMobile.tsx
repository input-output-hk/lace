import { useTranslation } from '@lace-contract/i18n';
import React, {
  useCallback,
  useRef,
  useState,
  forwardRef,
  useEffect,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import { spacing, useTheme } from '../../../design-tokens';
import { Button, Column, Icon, Loader, Row, Text } from '../../atoms';
import { LaceLogo } from '../../atoms/logo/logo';
import { isIOS } from '../../util/commons';

import { isValidUrlScheme } from './webView';

import type { WebViewRef, WebViewTemplateProps } from './webView';
import type { Theme } from '../../../design-tokens';
import type { WebViewProps as RNWebViewProps } from 'react-native-webview';
import type {
  WebViewNavigationEvent,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  ShouldStartLoadRequest,
} from 'react-native-webview/lib/WebViewTypes';

const InternalWebView = forwardRef<WebViewRef, RNWebViewProps>(
  ({ style, ...rest }, ref) => {
    return (
      <RNWebView
        ref={ref as React.LegacyRef<React.ComponentRef<typeof RNWebView>>}
        style={style}
        {...rest}
      />
    );
  },
);

InternalWebView.displayName = 'InternalWebView';

const webViewProps = {
  javaScriptEnabled: true,
  domStorageEnabled: true,
  cacheEnabled: true,
  startInLoadingState: true,
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  allowsBackForwardNavigationGestures: true,
  sharedCookiesEnabled: true,
  thirdPartyCookiesEnabled: true,
  // Only allow http/https — blocks javascript:, file:, and other schemes
  originWhitelist: ['https://*', 'http://*'],
  mixedContentMode: 'never' as const,
  androidLayerType: 'hardware' as const,
  setSupportMultipleWindows: false,
  incognito: false,
};

const useWebViewEventHandlers = ({
  onLoadStart,
  onLoadEnd,
  onError,
  onHttpError,
}: {
  onLoadStart?: (url: string) => void;
  onLoadEnd?: (url: string, loadTime: number) => void;
  onError?: (error: {
    code: number;
    description: string;
    domain: string;
    url: string;
  }) => void;
  onHttpError?: (error: { statusCode: number; url: string }) => void;
}) => {
  const loadStartTimeRef = useRef<number>(0);

  const handleLoadStart = useCallback(
    (event: WebViewNavigationEvent) => {
      const { nativeEvent } = event;
      loadStartTimeRef.current = Date.now();
      onLoadStart?.(nativeEvent.url);
    },
    [onLoadStart],
  );

  const handleLoadEnd = useCallback(
    (event: WebViewErrorEvent | WebViewNavigationEvent) => {
      // Both WebViewErrorEvent and WebViewNavigationEvent have nativeEvent with url and loading
      // On Android, navigationType may not exist, so we check for url and loading directly
      const { nativeEvent } = event;
      const loadTime = Date.now() - loadStartTimeRef.current;
      const url = nativeEvent.url;
      const isLoading = nativeEvent.loading;

      if (url && !isLoading) {
        onLoadEnd?.(url, loadTime);
      }
    },
    [onLoadEnd],
  );

  const handleError = useCallback(
    (event: WebViewErrorEvent) => {
      const { nativeEvent } = event;
      onError?.({
        code: nativeEvent.code,
        description: nativeEvent.description,
        domain: nativeEvent.domain ?? '',
        url: nativeEvent.url,
      });
    },
    [onError],
  );

  const handleHttpError = useCallback(
    (event: WebViewHttpErrorEvent) => {
      const { nativeEvent } = event;
      onHttpError?.({
        statusCode: nativeEvent.statusCode,
        url: nativeEvent.url,
      });
    },
    [onHttpError],
  );

  return {
    handleLoadStart,
    handleLoadEnd,
    handleError,
    handleHttpError,
  };
};

// Script to wrap console methods and forward to React Native (for debugging)
const consoleForwardingScript = `
(function() {
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
  };
  
  const forward = (level) => (...args) => {
    originalConsole[level](...args);
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          source: 'webview-console',
          level: level,
          message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
        }));
      }
    } catch(e) {}
  };
  
  console.log = forward('log');
  console.warn = forward('warn');
  console.error = forward('error');
  console.info = forward('info');
  console.debug = forward('debug');
})();
true;
`;

export const WebViewTemplateMobile = ({
  url,
  onLoadStart,
  onLoadEnd,
  onError,
  onHttpError,
  errorMessage,
  testID = 'webview-template',
  injectedJavaScriptBeforeContentLoaded,
  injectedJavaScript,
  onMessage,
  debugMode,
  onInjectJavaScriptReady,
  navBar,
}: WebViewTemplateProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(theme);

  // Hooks must be called unconditionally before any early returns
  const webViewRef = useRef<WebViewRef>(null);
  const hasForcedInitialNavigationRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  // Create a stable injectJavaScript function that forwards to the WebView ref
  const injectJavaScript = useCallback((script: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    }
  }, []);

  // Notify parent when the injectJavaScript function is ready
  useEffect(() => {
    onInjectJavaScriptReady?.(injectJavaScript);
  }, [onInjectJavaScriptReady, injectJavaScript]);

  const { handleLoadStart, handleLoadEnd, handleError, handleHttpError } =
    useWebViewEventHandlers({
      onLoadStart,
      onLoadEnd,
      onError,
      onHttpError,
    });

  // Validate URL scheme - check if URL is empty, invalid, or uses dangerous schemes
  const isValidUrl =
    Boolean(url && typeof url === 'string' && url.trim().length > 0) &&
    isValidUrlScheme(url);

  useEffect(() => {
    hasForcedInitialNavigationRef.current = false;
  }, [url]);

  // Handler to intercept navigation attempts and validate URLs
  const handleShouldStartLoadWithRequest = useCallback(
    (event: ShouldStartLoadRequest): boolean => {
      const { url: requestUrl } = event;
      const isSafeInternalNavigation = requestUrl === 'about:blank';
      // Block navigation to URLs with dangerous schemes
      if (!isSafeInternalNavigation && !isValidUrlScheme(requestUrl)) {
        onError?.({
          code: -1,
          description: 'Navigation blocked: Invalid URL scheme',
          domain: 'Security',
          url: requestUrl,
        });
        return false;
      }
      return true;
    },
    [onError],
  );

  const handleWebViewLoadStart = useCallback(
    (event: WebViewNavigationEvent) => {
      setIsLoading(true);
      handleLoadStart(event);
    },
    [handleLoadStart],
  );

  const handleWebViewLoadEnd = useCallback(
    (event: WebViewErrorEvent | WebViewNavigationEvent) => {
      if (
        isIOS &&
        event.nativeEvent.url === 'about:blank' &&
        url !== 'about:blank' &&
        !hasForcedInitialNavigationRef.current
      ) {
        hasForcedInitialNavigationRef.current = true;
        // iOS WKWebView sometimes gets stuck on about:blank; force navigation to the real URL.
        webViewRef.current?.injectJavaScript(
          `window.location.replace(${JSON.stringify(url)}); true;`,
        );
        return;
      }

      setIsLoading(false);
      handleLoadEnd(event);
    },
    [handleLoadEnd, url],
  );

  const handleWebViewError = useCallback(
    (event: WebViewErrorEvent) => {
      setIsLoading(false);
      handleError(event);
    },
    [handleError],
  );

  const handleWebViewHttpError = useCallback(
    (event: WebViewHttpErrorEvent) => {
      handleHttpError(event);
    },
    [handleHttpError],
  );

  // Render error view if URL is invalid or uses dangerous scheme
  if (!isValidUrl) {
    return (
      <View style={styles.container} testID={testID}>
        <Column
          style={styles.errorContainer}
          alignItems="center"
          justifyContent="center"
          gap={spacing.M}
          testID={`${testID}-error`}>
          <Icon
            name="AlertSquare"
            size={64}
            color={theme.background.negative}
          />
          <Text.M align="center" style={styles.errorText}>
            {errorMessage || t('v2.webview.error.noUrl')}
          </Text.M>
        </Column>
      </View>
    );
  }

  // Handle messages from the WebView (for dApp connector communication)
  const tryHandleConsoleMessage = useCallback(
    (rawData: string): boolean => {
      if (!debugMode) return false;

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawData);
      } catch {
        return false;
      }

      if (typeof parsed !== 'object' || parsed === null) return false;
      const source = (parsed as { source?: unknown }).source;
      if (source !== 'webview-console') return false;

      const { level, message } = parsed as {
        level?: unknown;
        message?: unknown;
      };
      const levelLabel =
        typeof level === 'string' || typeof level === 'number'
          ? String(level)
          : 'log';

      // eslint-disable-next-line no-console
      console.log(`[WebView ${levelLabel}]`, message);
      return true;
    },
    [debugMode],
  );

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const data = event.nativeEvent.data;

      if (debugMode && tryHandleConsoleMessage(data)) return;
      onMessage?.(data);
    },
    [debugMode, tryHandleConsoleMessage, onMessage],
  );

  // Combine injection scripts - console forwarding first in debug mode
  const combinedInjectionScript = debugMode
    ? `${consoleForwardingScript}\n${
        injectedJavaScriptBeforeContentLoaded || ''
      }`
    : injectedJavaScriptBeforeContentLoaded;

  return (
    <View style={styles.container} testID={testID}>
      {navBar ? (
        <View style={styles.navBar} testID={`${testID}-nav-bar`}>
          {/* Absolutely positioned so the URL stays centred regardless of sidebar widths */}
          <View style={styles.navBarUrlContainer} pointerEvents="none">
            <Text.M
              variant="secondary"
              numberOfLines={1}
              style={styles.navBarUrl}>
              {navBar.displayUrl}
            </Text.M>
          </View>
          <LaceLogo />
          <View style={styles.navBarSpacer} />
          <Row gap={spacing.S} alignItems="center">
            {isLoading ? (
              <Loader size={20} testID={`${testID}-nav-bar-loader`} />
            ) : null}
            <Button.Secondary
              size="small"
              label={t('v2.webview.navBar.done')}
              onPress={navBar.onDone}
              testID={`${testID}-done-button`}
            />
          </Row>
        </View>
      ) : null}
      <View style={styles.webViewContainer}>
        <InternalWebView
          key={url}
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          onLoadStart={handleWebViewLoadStart}
          onLoadEnd={handleWebViewLoadEnd}
          onError={handleWebViewError}
          onHttpError={handleWebViewHttpError}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={combinedInjectionScript}
          injectedJavaScript={injectedJavaScript}
          {...webViewProps}
        />
      </View>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.S,
      padding: spacing.S,
      backgroundColor: theme.background.page,
    },
    navBarUrlContainer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.XL * 3,
    },
    navBarUrl: {
      color: theme.text.secondary,
    },
    navBarSpacer: {
      flex: 1,
    },
    webViewContainer: {
      flex: 1,
    },
    webView: {
      flex: 1,
    },
    errorContainer: {
      flex: 1,
      padding: spacing.L,
    },
    errorText: {
      color: theme.text.primary,
    },
  });
