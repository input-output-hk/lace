import { useTranslation } from '@lace-contract/i18n';
import { Loader, Text, spacing, useTheme } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

export const SettingUpOverlay = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.overlay} testID="onboarding-start-setting-up-overlay">
      <Loader size={36} testID="onboarding-start-setting-up-loader" />
      <Text.M align="center">{t('onboarding.start.setting-up')}</Text.M>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.L,
      backgroundColor: theme.background.page,
    },
  });
