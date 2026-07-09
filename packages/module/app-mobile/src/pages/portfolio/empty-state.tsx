import { Icon, Column, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

import type { IconName } from '@lace-lib/ui-toolkit';

interface PortfolioEmptyStateProps {
  iconName: IconName;
  message: string;
}

export const PortfolioEmptyState = ({
  iconName,
  message,
}: PortfolioEmptyStateProps) => {
  return (
    <Column
      justifyContent="center"
      alignItems="center"
      gap={spacing.M}
      testID="profile-empty-state-card"
      style={styles.container}>
      <Icon name={iconName} size={40} />
      <Text.M testID="profile-empty-state-title">{message}</Text.M>
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.XXXXL,
  },
});
