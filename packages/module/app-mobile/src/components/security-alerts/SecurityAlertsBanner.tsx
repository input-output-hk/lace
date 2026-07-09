import {
  EXPLOIT_DESCRIPTORS,
  FEATURE_FLAG_WALLET_SECURITY_ALERTS,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import {
  InlineWindow,
  isWeb,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { WalletSecurityAlertsFeatureFlagPayload } from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';

interface SecurityAlertsBannerProps {
  accountId: AccountId;
}

type ResolvedBanner = {
  exploitId: string;
  title: string;
  description: string;
  infoUrl: string;
};

/**
 * Persistent per-account banner for security exploits flagged on the account's
 * activities (e.g. the SecondFi/Yoroi compromise). Renders one banner per
 * flagged-and-enabled exploit, gated by WALLET_SECURITY_ALERTS, linking to the
 * configured info URL. Generic over exploit ids via EXPLOIT_DESCRIPTORS.
 *
 * When the account is clean of flagged exploits, surfaces the proactive
 * re-scan: a scanning notice while a scan is in flight, a "Check" prompt when
 * the account needs a re-scan (onboarded before detection shipped, per
 * selectNeedsSecurityRescan), and a low-key clean note once a scan finishes
 * with no findings. Accounts onboarded after detection shipped show nothing.
 * The compromise branch always wins over the proactive branches.
 *
 * The proactive prompt and clean note are dismissible (close button); dismissing
 * suppresses both for that account permanently. The compromise branch is never
 * dismissible.
 */
export const SecurityAlertsBanner = ({
  accountId,
}: SecurityAlertsBannerProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const flaggedExploits = useLaceSelector(
    'cardanoContext.selectAccountFlaggedExploits',
    accountId,
  );
  const scanState = useLaceSelector(
    'cardanoContext.selectSecurityScanState',
    accountId,
  );
  const shouldOfferRescan = useLaceSelector(
    'cardanoContext.selectNeedsSecurityRescan',
    accountId,
  );
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const requestSecurityRescan = useDispatchLaceAction(
    'cardanoContext.requestSecurityRescan',
  );
  const dismissSecurityRescan = useDispatchLaceAction(
    'cardanoContext.dismissSecurityRescan',
  );

  const securityAlertsFlag = useMemo(
    () =>
      featureFlags.find(
        ({ key }) => key === FEATURE_FLAG_WALLET_SECURITY_ALERTS,
      ),
    [featureFlags],
  );

  const securityAlertsPayload = useMemo<
    WalletSecurityAlertsFeatureFlagPayload | undefined
  >(() => {
    if (!securityAlertsFlag) return undefined;
    return 'payload' in securityAlertsFlag
      ? (securityAlertsFlag.payload as
          | WalletSecurityAlertsFeatureFlagPayload
          | undefined)
      : undefined;
  }, [securityAlertsFlag]);

  const banners = useMemo<ResolvedBanner[]>(() => {
    if (!securityAlertsFlag) return [];
    return flaggedExploits.flatMap(exploitId => {
      const descriptor = EXPLOIT_DESCRIPTORS[exploitId];
      if (!descriptor) return [];
      const override = securityAlertsPayload?.exploits?.[exploitId];
      if (override?.enabled === false) return [];
      return [
        {
          exploitId,
          title:
            override?.copy?.banner ??
            t(descriptor.copyKeys.bannerTitle as TranslationKey),
          description: t(descriptor.copyKeys.bannerBody as TranslationKey),
          infoUrl: override?.infoUrl ?? descriptor.defaultInfoUrl,
        },
      ];
    });
  }, [securityAlertsFlag, securityAlertsPayload, flaggedExploits, t]);

  /**
   * Default external info URL for the proactive and clean states. We don't have
   * a specific exploit context (those banners only render when no exploit is
   * flagged), so we use the first enabled descriptor's URL. With one exploit
   * today this is unambiguous; if multiple are ever enabled simultaneously the
   * payload can override this per deployment.
   */
  const defaultExternalInfoUrl = useMemo<string | undefined>(() => {
    if (!securityAlertsFlag) return undefined;
    for (const exploitId of Object.keys(EXPLOIT_DESCRIPTORS)) {
      if (securityAlertsPayload?.exploits?.[exploitId]?.enabled === false)
        continue;
      const descriptor = EXPLOIT_DESCRIPTORS[exploitId];
      if (!descriptor) continue;
      return (
        securityAlertsPayload?.exploits?.[exploitId]?.infoUrl ??
        descriptor.defaultInfoUrl
      );
    }
    return undefined;
  }, [securityAlertsFlag, securityAlertsPayload]);

  const compromisedCardStyle = useMemo(
    () => ({
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.background.negative,
      backgroundColor: theme.background.secondary,
    }),
    [theme.background.negative, theme.background.secondary],
  );

  const neutralCardStyle = useMemo(
    () => ({
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border.middle,
      backgroundColor: theme.background.secondary,
    }),
    [theme.border.middle, theme.background.secondary],
  );

  const handleOpen = useCallback((url: string) => {
    // The exposure-check dApp needs Lace's CIP-30 connector. On the extension a
    // browser tab gets the content-script injection; on mobile the connector
    // only exists in the in-app dApp browser, not the system browser.
    if (isWeb) {
      void Linking.openURL(url);
      return;
    }
    NavigationControls.navigate(StackRoutes.DappExternalWebView, {
      title: url,
      dapp: { icon: { fallback: url }, name: url, category: '' },
      buttonUrl: url,
      canFavorite: false,
    });
  }, []);

  const handleCheck = useCallback(() => {
    requestSecurityRescan({ accountId });
  }, [requestSecurityRescan, accountId]);

  const handleDismiss = useCallback(() => {
    dismissSecurityRescan({ accountId });
  }, [dismissSecurityRescan, accountId]);

  const scanningDescription = useMemo(
    () => (
      <View style={styles.scanningRow}>
        <ActivityIndicator size="small" color={theme.text.secondary} />
        <Text.S variant="secondary" style={styles.scanningText}>
          {t('wallet-security-alerts.scanning')}
        </Text.S>
      </View>
    ),
    [t, theme.text.secondary],
  );

  if (banners.length > 0) {
    return (
      <View style={styles.container}>
        {banners.map(banner => (
          <View key={banner.exploitId} style={styles.banner}>
            <InlineWindow
              title={banner.title}
              description={
                <View>
                  <Text.S variant="secondary" style={styles.paragraph}>
                    {banner.description}
                  </Text.S>
                  <Text.S variant="secondary" style={styles.paragraph}>
                    {t('wallet-security-alerts.disclaimer')}
                  </Text.S>
                  <TouchableOpacity
                    onPress={() => {
                      handleOpen(banner.infoUrl);
                    }}>
                    <Text.S style={styles.secondaryLinkText}>
                      {t('wallet-security-alerts.incident-link')}
                    </Text.S>
                  </TouchableOpacity>
                </View>
              }
              action={noop}
              leftIcon="AlertTriangle"
              leftIconColor={theme.background.negative}
              progressValue={0}
              cardStyle={compromisedCardStyle}
            />
          </View>
        ))}
      </View>
    );
  }

  if (!securityAlertsFlag) return null;

  if (scanState.scanning) {
    return (
      <View style={styles.container}>
        <InlineWindow
          description={scanningDescription}
          action={noop}
          progressValue={0}
          cardStyle={neutralCardStyle}
        />
      </View>
    );
  }

  if (shouldOfferRescan) {
    const proactiveDescription = (
      <View>
        <Text.S variant="secondary" style={styles.paragraph}>
          {t('wallet-security-alerts.proactive.body')}
        </Text.S>
        <Text.S variant="secondary" style={styles.paragraph}>
          {t('wallet-security-alerts.proactive.body-caveat')}
        </Text.S>
        <Text.S variant="secondary" style={styles.paragraph}>
          {t('wallet-security-alerts.disclaimer')}
        </Text.S>
        {defaultExternalInfoUrl ? (
          <TouchableOpacity
            onPress={() => {
              handleOpen(defaultExternalInfoUrl);
            }}
            style={styles.paragraph}
            testID="wallet-security-alerts-proactive-external-link">
            <Text.S style={styles.secondaryLinkText}>
              {t('wallet-security-alerts.incident-link')}
            </Text.S>
          </TouchableOpacity>
        ) : null}
        <Text.S variant="secondary">
          {t('wallet-security-alerts.proactive.consent')}
        </Text.S>
      </View>
    );

    return (
      <View style={styles.container}>
        <InlineWindow
          title={t('wallet-security-alerts.proactive.title')}
          description={proactiveDescription}
          buttonLabel={t('wallet-security-alerts.proactive.cta')}
          action={handleCheck}
          onClose={handleDismiss}
          leftIcon="AlertTriangle"
          leftIconColor={theme.text.secondary}
          progressValue={0}
          cardStyle={neutralCardStyle}
        />
      </View>
    );
  }

  if (scanState.scanned && !scanState.dismissed) {
    return (
      <View style={styles.container}>
        <InlineWindow
          title={t('wallet-security-alerts.clean.title')}
          description={
            <View>
              <Text.S variant="secondary" style={styles.paragraph}>
                {t('wallet-security-alerts.clean.body')}
              </Text.S>
              <Text.S variant="secondary" style={styles.paragraph}>
                {t('wallet-security-alerts.disclaimer')}
              </Text.S>
              {defaultExternalInfoUrl ? (
                <TouchableOpacity
                  onPress={() => {
                    handleOpen(defaultExternalInfoUrl);
                  }}>
                  <Text.S style={styles.secondaryLinkText}>
                    {t('wallet-security-alerts.incident-link')}
                  </Text.S>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          action={noop}
          onClose={handleDismiss}
          progressValue={0}
          cardStyle={neutralCardStyle}
        />
      </View>
    );
  }

  return null;
};

const noop = () => undefined;

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.M,
  },
  banner: {
    marginBottom: spacing.S,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.S,
  },
  scanningText: {
    flexShrink: 1,
  },
  paragraph: {
    marginBottom: spacing.S,
  },
  secondaryLinkText: {
    textDecorationLine: 'underline',
  },
});
