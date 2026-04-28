import React from 'react';

import { isWeb } from '../../util/commons';

import { WebViewTemplateMobile } from './webViewMobile';
import { WebViewTemplateWeb } from './webViewWeb';

/**
 * Validates that a URL uses a safe scheme (http:// or https:// only).
 * Rejects dangerous schemes like javascript:, file:, data:, etc.
 */
export const isValidUrlScheme = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const scheme = parsedUrl.protocol.toLowerCase();
    // Only allow http and https schemes for security
    return scheme === 'http:' || scheme === 'https:';
  } catch {
    // If URL parsing fails, check if it starts with http:// or https://
    const trimmedUrl = url.trim().toLowerCase();
    return (
      trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
    );
  }
};

export type WebViewRef = {
  injectJavaScript: (script: string) => void;
  reload: () => void;
  goBack: () => void;
  goForward: () => void;
  stopLoading: () => void;
};

export interface WebViewNavBarProps {
  /** The base URL or hostname to display in the nav bar */
  displayUrl: string;
  /** Callback when the Done button is pressed */
  onDone: () => void;
}

export interface WebViewTemplateProps {
  url: string;
  onLoadStart?: (url: string) => void;
  onLoadEnd?: (url: string, loadTime: number) => void;
  onError?: (error: {
    code: number;
    description: string;
    domain: string;
    url: string;
  }) => void;
  onHttpError?: (error: { statusCode: number; url: string }) => void;
  errorMessage: string;
  testID?: string;
  onWebTabOpened?: () => void;
  headerTitle?: string;
  /** Nav bar configuration. When provided, renders a top bar with Lace logo, URL, and Done button. */
  navBar?: WebViewNavBarProps;
  /**
   * Force rendering the native WebView even on web platform.
   * Useful for Storybook or testing environments where you want to
   * see the actual WebView component instead of opening a new tab.
   */
  forceNativeRender?: boolean;
  /**
   * JavaScript code to inject into the WebView before any other scripts run.
   */
  injectedJavaScriptBeforeContentLoaded?: string;
  /**
   * JavaScript code to inject after the page loads.
   */
  injectedJavaScript?: string;
  /**
   * Callback for messages posted from the WebView via window.ReactNativeWebView.postMessage().
   */
  onMessage?: (data: string) => void;
  /**
   * Enable debug mode to forward WebView console messages to React Native console.
   * Useful for debugging injected scripts.
   */
  debugMode?: boolean;
  /**
   * Callback that provides the injectJavaScript function when the WebView mounts.
   *
   * @example
   * ```tsx
   * const [injectJs, setInjectJs] = useState<((script: string) => void) | null>(null);
   *
   * <WebViewTemplate
   *   url={dappUrl}
   *   onInjectJavaScriptReady={setInjectJs}
   * />
   *
   * // Later, to send a response:
   * injectJs?.('window.callback(JSON.stringify({ success: true }))');
   * ```
   */
  onInjectJavaScriptReady?: (
    injectJavaScript: (script: string) => void,
  ) => void;
}

export const WebViewTemplate = ({
  forceNativeRender,
  ...props
}: WebViewTemplateProps) => {
  if (isWeb && !forceNativeRender) {
    return <WebViewTemplateWeb {...props} />;
  }
  return <WebViewTemplateMobile {...props} />;
};
