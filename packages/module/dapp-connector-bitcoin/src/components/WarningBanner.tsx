import { Icon, Row, spacing, Text, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

export interface WarningBannerProps {
  message: string;
  testID?: string;
}

/**
 * Inline warning banner for the sign PSBT review screen: flags a dangerous
 * or unverifiable request so the user sees it before approving.
 */
export const WarningBanner = ({ message, testID }: WarningBannerProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <Row style={styles.banner} testID={testID}>
      <Icon name="AlertTriangle" size={16} color={theme.brand.yellow} />
      <Text.XS style={styles.text}>{message}</Text.XS>
    </Row>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    banner: {
      alignItems: 'flex-start',
      gap: spacing.XS,
      backgroundColor: theme.brand.yellowSecondary,
      borderRadius: spacing.XS,
      padding: spacing.S,
    },
    text: {
      flex: 1,
      color: theme.brand.darkGray,
    },
  });
