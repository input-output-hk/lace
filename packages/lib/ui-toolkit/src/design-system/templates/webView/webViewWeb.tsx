import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Column, Icon, Text, Button } from '../../atoms';

import { isValidUrlScheme } from './webView';

import type { WebViewTemplateProps } from './webView';

export const WebViewTemplateWeb = ({
  url,
  onLoadStart,
  onLoadEnd,
  onWebTabOpened,
  errorMessage,
  testID = 'webview-template',
}: WebViewTemplateProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles();

  // Validate URL scheme - check if URL is empty, invalid, or uses dangerous schemes
  // Matches mobile validation for consistent security posture
  const isValidUrl =
    Boolean(url && typeof url === 'string' && url.trim().length > 0) &&
    isValidUrlScheme(url);

  // Handle opening URL in a new tab
  const handleOpenUrl = useCallback(() => {
    if (!isValidUrl) return;

    window.open(url, '_blank', 'noopener,noreferrer');
    onLoadStart?.(url);
    onLoadEnd?.(url, 0);
    onWebTabOpened?.();
  }, [url, isValidUrl, onLoadStart, onLoadEnd, onWebTabOpened]);

  // Render error view if URL is invalid
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
          <Text.M align="center">
            {errorMessage || t('v2.webview.error.noUrl')}
          </Text.M>
        </Column>
      </View>
    );
  }

  // Render UI with button to open URL - preserves user gesture context
  return (
    <View style={styles.container} testID={testID}>
      <Column
        style={styles.contentContainer}
        alignItems="center"
        justifyContent="center"
        gap={spacing.L}
        testID={`${testID}-content`}>
        <Icon
          name="CircleArrowUpRight"
          size={64}
          color={theme.text.primary}
          testID={`${testID}-icon`}
        />
        <Column alignItems="center" gap={spacing.S}>
          <Text.M align="center">{t('v2.webview.web.title')}</Text.M>
          <Text.S align="center" variant="secondary" style={styles.urlText}>
            {url}
          </Text.S>
        </Column>
        <Button.Primary
          label={t('v2.webview.web.openButton')}
          onPress={handleOpenUrl}
          preIconName="ArrowUpRight"
          testID={`${testID}-open-button`}
        />
      </Column>
    </View>
  );
};

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      padding: spacing.L,
    },
    errorContainer: {
      flex: 1,
      padding: spacing.L,
    },
    urlText: {
      maxWidth: '100%',
    },
  });
