import type { StyleProp, ViewStyle } from 'react-native';

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
import {
  Column,
  Icon,
  IconButton,
  LaceLogoMulticolor,
  Text,
} from '../../atoms';
import { isIOS } from '../../util/commons';

import { isValidUrlScheme } from './webView';

import type { WebViewRef, WebViewTemplateProps } from './webView';
import type { Theme } from '../../../design-tokens';
import type { WebViewProps as RNWebViewProps } from 'react-native-webview';
import type {
  WebViewNavigationEvent,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewProgressEvent,
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

interface WebViewProgressBarProps {
  progress: number;
  style: StyleProp<ViewStyle>;
  testID: string;
}

// Thin loading strip under the nav bar; hidden while idle (0) or complete (1).
const WebViewProgressBar = ({
  progress,
  style,
  testID,
}: WebViewProgressBarProps) => {
  if (progress <= 0 || progress >= 1) return null;
  return (
    <View style={[style, { width: `${progress * 100}%` }]} testID={testID} />
  );
};

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
  const [progress, setProgress] = useState(0);

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
    setProgress(0);
  }, [url]);

  const handleWebViewLoadProgress = useCallback(
    (event: WebViewProgressEvent) => {
      setProgress(event.nativeEvent.progress);
    },
    [],
  );

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
      setProgress(0);
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

      setProgress(1);
      handleLoadEnd(event);
    },
    [handleLoadEnd, url],
  );

  const handleWebViewError = useCallback(
    (event: WebViewErrorEvent) => {
      setProgress(1);
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

  // Combine injection scripts - console forwarding first in debug mode
  const combinedInjectionScript = debugMode
    ? `${consoleForwardingScript}\n${
        injectedJavaScriptBeforeContentLoaded || ''
      }`
    : injectedJavaScriptBeforeContentLoaded;

  return (
    <View style={styles.container} testID={testID}>
      {navBar ? (
        <View style={styles.navBarContainer}>
          <View style={styles.navBar} testID={`${testID}-nav-bar`}>
            {/* Absolutely positioned so the URL stays centred regardless of sidebar widths */}
            <View style={styles.navBarUrlContainer} pointerEvents="none">
              <Text.M weight="700" numberOfLines={1} style={styles.navBarUrl}>
                {navBar.displayUrl}
              </Text.M>
            </View>
            <LaceLogoMulticolor size={40} />
            <View style={styles.navBarSpacer} />
            {navBar.favorite ? (
              <IconButton.Static
                accessibilityLabel={navBar.favorite.accessibilityLabel}
                containerStyle={styles.navBarFavoriteButton}
                icon={
                  <Icon
                    name="Star"
                    size={24}
                    variant={navBar.favorite.isSaved ? 'solid' : 'stroke'}
                    color={theme.text.primary}
                  />
                }
                onPress={navBar.favorite.onToggle}
                testID={`${testID}-favorite-button`}
              />
            ) : null}
            <IconButton.Static
              accessibilityLabel={String(t('v2.webview.navBar.done'))}
              containerStyle={styles.navBarCloseButton}
              icon={<Icon name="Cancel" size={24} color={theme.text.primary} />}
              onPress={navBar.onDone}
              testID={`${testID}-done-button`}
            />
          </View>
          <WebViewProgressBar
            progress={progress}
            style={styles.navBarProgress}
            testID={`${testID}-nav-bar-progress`}
          />
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
          onLoadProgress={handleWebViewLoadProgress}
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
    navBarContainer: {
      position: 'relative',
      zIndex: 1,
      elevation: 1,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.S,
      padding: spacing.S,
      backgroundColor: 'transparent',
    },
    navBarUrlContainer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.XL * 3,
    },
    navBarUrl: {
      color: theme.text.primary,
    },
    navBarCloseButton: {
      backgroundColor: theme.background.primary,
    },
    navBarFavoriteButton: {
      backgroundColor: theme.background.primary,
    },
    navBarProgress: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: 2,
      backgroundColor: theme.brand.ascending,
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
