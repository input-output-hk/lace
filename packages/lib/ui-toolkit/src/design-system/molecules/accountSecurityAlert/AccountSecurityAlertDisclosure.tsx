import { useAccountSecurityAlert } from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Text } from '../../atoms/text/text';

import type { AccountId } from '@lace-contract/wallet-repo';

interface AccountSecurityAlertDisclosureProps {
  accountId: AccountId;
  /** When `false` the component returns null (no animation for now — the
   *  caller controls mount/unmount). The compound wrapper uses this in
   *  conjunction with the chip's `expanded` state. */
  expanded: boolean;
  testID?: string;
}

/**
 * Collapsible detail block that mirrors the copy the SecurityAlertsBanner
 * shows on the portfolio's per-account view, so users encountering a
 * compromised account in a signing sheet / receive sheet / send flow can
 * read the same explanation + disclaimer + third-party incident link
 * without navigating away and losing signing state.
 *
 * Returns null when the account has no flagged exploits, the flag is off,
 * or `expanded` is false. Style + copy lives here — one place to iterate.
 */
export const AccountSecurityAlertDisclosure = ({
  accountId,
  expanded,
  testID,
}: AccountSecurityAlertDisclosureProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const alert = useAccountSecurityAlert(accountId);
  const styles = useMemo(() => getStyles(theme), [theme]);

  const openIncidentUpdate = useCallback(() => {
    if (!alert) return;
    // Delegate to the platform default URL handler. Mobile screens that
    // wanted this to route via `NavigationControls.navigate(...
    // DappExternalWebView)` would create a `ui-toolkit → navigation →
    // ui-toolkit` cycle from here, so callers that need an in-app browser
    // can wrap the disclosure and intercept the press instead.
    void Linking.openURL(alert.infoUrl);
  }, [alert]);

  if (!alert || !expanded) return null;

  return (
    <View
      style={styles.container}
      testID={testID ?? 'account-security-alert-disclosure'}>
      <Text.S style={styles.title}>{alert.bannerTitle}</Text.S>
      <Text.S variant="secondary" style={styles.paragraph}>
        {alert.bannerBody}
      </Text.S>
      <Text.S variant="secondary" style={styles.paragraph}>
        {t('wallet-security-alerts.disclaimer')}
      </Text.S>
      <TouchableOpacity onPress={openIncidentUpdate}>
        <Text.S style={styles.link}>
          {t('wallet-security-alerts.incident-link')}
        </Text.S>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      marginTop: spacing.S,
      padding: spacing.M,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.background.negative,
      backgroundColor: theme.background.secondary,
      gap: spacing.S,
    },
    title: {
      color: theme.background.negative,
      fontWeight: '600',
    },
    paragraph: {
      // no extra style — spacing handled by container.gap
    },
    link: {
      textDecorationLine: 'underline',
    },
  });
