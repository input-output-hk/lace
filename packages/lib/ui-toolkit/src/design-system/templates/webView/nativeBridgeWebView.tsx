import React, {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { spacing, useTheme } from '../../../design-tokens';
import { Text } from '../../atoms';

import type { WebViewTemplateProps } from './webView';
import type { WebViewProps } from 'react-native-webview';

type Notice = { title: string; body: string };
type Status = {
  requestId: string;
  documentStartScript: boolean;
  webMessageListener: boolean;
};
type Props = Omit<
  WebViewProps,
  'laceBridgeStatusRequestId' | 'onLaceBridgeStatus'
> &
  Pick<WebViewTemplateProps, 'onBridgeCompatibilityClassified'> & {
    bridgeUnavailableNotice?: Notice;
  };

const requestSequence = { value: 0 };

/** Native capability results are view-scoped; page messages never reach this handler. */
export const NativeBridgeWebView = forwardRef<WebView, Props>(
  (
    {
      bridgeUnavailableNotice,
      onBridgeCompatibilityClassified,
      injectedJavaScriptBeforeContentLoaded,
      ...props
    },
    ref,
  ) => {
    const { theme } = useTheme();
    const [requestId, setRequestId] = useState<string>();
    const [isUnsupported, setUnsupported] = useState(false);
    const activeRequest = useRef<string | undefined>(undefined);
    const compatibilityReported = useRef(false);
    const isEnabled =
      Platform.OS === 'android' && bridgeUnavailableNotice !== undefined;

    useLayoutEffect(() => {
      // Request in a second transaction, after the view and its event handler exist.
      const id = isEnabled
        ? `lace-status-${++requestSequence.value}`
        : undefined;
      activeRequest.current = id;
      setRequestId(id);
      setUnsupported(false);
      return () => {
        activeRequest.current = undefined;
      };
    }, [isEnabled, injectedJavaScriptBeforeContentLoaded]);

    const onLaceBridgeStatus = useCallback(
      ({ nativeEvent }: { nativeEvent: Status }) => {
        if (
          !activeRequest.current ||
          nativeEvent.requestId !== activeRequest.current ||
          typeof nativeEvent.documentStartScript !== 'boolean' ||
          typeof nativeEvent.webMessageListener !== 'boolean'
        )
          return;
        setUnsupported(
          !nativeEvent.documentStartScript || !nativeEvent.webMessageListener,
        );
        if (compatibilityReported.current || !onBridgeCompatibilityClassified)
          return;
        // The unit is a mounted view, not a document or status request. Never retry a failed report.
        compatibilityReported.current = true;
        const outcome = nativeEvent.documentStartScript
          ? nativeEvent.webMessageListener
            ? 'supported'
            : 'missing_web_message_listener'
          : nativeEvent.webMessageListener
          ? 'missing_document_start_script'
          : 'missing_both';
        try {
          const report: () => unknown = onBridgeCompatibilityClassified.bind(
            undefined,
            outcome,
          );
          void Promise.resolve(report()).catch(() => {});
        } catch {
          // Measurement must not interrupt browsing or the unsupported-feature notice.
        }
      },
      [onBridgeCompatibilityClassified],
    );

    return (
      <>
        {isUnsupported && bridgeUnavailableNotice ? (
          <View
            accessibilityLiveRegion="polite"
            testID="dapp-wallet-unavailable"
            style={{
              padding: spacing.S,
              gap: spacing.XS,
              backgroundColor: theme.background.secondary,
            }}>
            <Text.S accessibilityRole="header" weight="700">
              {bridgeUnavailableNotice.title}
            </Text.S>
            <Text.S>{bridgeUnavailableNotice.body}</Text.S>
          </View>
        ) : null}
        <WebView
          {...props}
          ref={ref}
          injectedJavaScriptBeforeContentLoaded={
            injectedJavaScriptBeforeContentLoaded
          }
          {...(isEnabled
            ? { laceBridgeStatusRequestId: requestId, onLaceBridgeStatus }
            : {})}
        />
      </>
    );
  },
);

NativeBridgeWebView.displayName = 'NativeBridgeWebView';
