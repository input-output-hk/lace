import { useTranslation } from '@lace-contract/i18n';
import { Text, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { PROOF_SERVER_INSTALL_GUIDE_URL } from '../const';
import { useLaceSelector } from '../hooks/lace-context';

/**
 * Shared hook for Midnight proof server banner content.
 * Used by both PortfolioBanner and SendSheetFooterTitleRow to ensure consistency.
 */
export const useMidnightProofServerBannerContent = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { config } = useLaceSelector('midnightContext.selectCurrentNetwork');
  const mode = config.proofServer;

  const openInstallationGuide = useCallback(() => {
    void Linking.openURL(PROOF_SERVER_INSTALL_GUIDE_URL);
  }, []);

  const linkColor =
    theme.name === 'light'
      ? theme.brand.ascending
      : theme.brand.ascendingSecondary;

  const description = useMemo(() => {
    if (mode.kind !== 'local-host') {
      const text =
        mode.kind === 'delegated' || mode.kind === 'tee-delegated'
          ? t('midnight.proof-server.remote-notice')
          : t(
              mode.kind === 'in-process'
                ? 'midnight.proof-server.in-process.description'
                : 'midnight.proof-server.paired-device.description',
              {
                deviceName: mode.kind === 'paired-device' ? mode.pairingId : '',
              },
            );
      return <Text.S variant="secondary">{text}</Text.S>;
    }
    return (
      <Text.S variant="secondary">
        {t('v2.portfolio.midnight-banner.description')}{' '}
        <Text.S
          variant="secondary"
          onPress={openInstallationGuide}
          style={[styles.link, { color: linkColor }]}>
          {t('v2.portfolio.midnight-banner.description-link')}
        </Text.S>
      </Text.S>
    );
  }, [t, mode, openInstallationGuide, linkColor]);

  return {
    description,
    leftIcon: 'AlertTriangle' as const,
    leftIconColor: theme.brand.yellow,
  };
};

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
});
