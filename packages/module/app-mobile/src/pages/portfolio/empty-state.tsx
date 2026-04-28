import {
  Icon,
  Column,
  radius,
  spacing,
  Text,
  useTheme,
  BlurView,
  getIsDark,
} from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';
import type { IconName } from '@lace-lib/ui-toolkit';

interface PortfolioEmptyStateProps {
  iconName: IconName;
  message: string;
}

export const PortfolioEmptyState = ({
  iconName,
  message,
}: PortfolioEmptyStateProps) => {
  const { theme } = useTheme();
  const defaultStyles = styles(theme);

  return (
    <BlurView testID="profile-empty-state-card" style={defaultStyles.card}>
      <Column style={defaultStyles.container}>
        <Icon name={iconName} size={35} />
        <Text.S style={defaultStyles.title} testID="profile-empty-state-title">
          {message}
        </Text.S>
      </Column>
    </BlurView>
  );
};

const styles = (theme: Theme) => {
  const isDark = getIsDark(theme);
  const backgroundColor = isDark
    ? theme.background.primary
    : theme.background.overlay;
  return StyleSheet.create({
    card: {
      justifyContent: 'center',
      paddingVertical: spacing.L,
      width: '100%',
      padding: spacing.M,
      minHeight: 160,
      borderRadius: radius.M,
      backgroundColor: backgroundColor,
      overflow: 'hidden',
      marginTop: spacing.M,
    },
    container: {
      gap: spacing.L,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.M,
    },
    title: {
      textAlign: 'center',
      color: theme.text.secondary,
    },
  });
};
