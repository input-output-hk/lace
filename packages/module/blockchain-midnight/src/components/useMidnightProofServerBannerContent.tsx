import { useTranslation } from '@lace-contract/i18n';
import { Text, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { PROOF_SERVER_INSTALL_GUIDE_URL } from '../const';

/**
 * Shared hook for Midnight proof server banner content.
 * Used by both PortfolioBanner and SendSheetFooterTitleRow to ensure consistency.
 */
export const useMidnightProofServerBannerContent = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const openInstallationGuide = useCallback(() => {
    void Linking.openURL(PROOF_SERVER_INSTALL_GUIDE_URL);
  }, []);

  const linkColor =
    theme.name === 'light'
      ? theme.brand.ascending
      : theme.brand.ascendingSecondary;

  const description = useMemo(
    () => (
      <Text.S variant="secondary">
        {t('v2.portfolio.midnight-banner.description')}
        <Text.S
          variant="secondary"
          onPress={openInstallationGuide}
          style={[styles.link, { color: linkColor }]}>
          {t('v2.portfolio.midnight-banner.description-link')}
        </Text.S>
      </Text.S>
    ),
    [t, openInstallationGuide, linkColor],
  );

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
