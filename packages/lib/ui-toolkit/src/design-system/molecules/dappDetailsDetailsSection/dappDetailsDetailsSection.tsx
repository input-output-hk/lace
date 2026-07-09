import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Column, Text } from '../../atoms';

import type { Theme } from '../../../design-tokens';

export type DappDetailsDetailsSectionProps = {
  title: string;
  description: string;
};

export const DappDetailsDetailsSection = memo(
  ({ title, description }: DappDetailsDetailsSectionProps) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    return (
      <Column
        style={staticStyles.section}
        testID="dapp-details-description-wrapper">
        <Text.M
          testID="dapp-details-description-title"
          variant="secondary"
          style={styles.sectionTitle}>
          {title}
        </Text.M>
        <Text.S testID="dapp-details-description-content" variant="secondary">
          {description}
        </Text.S>
      </Column>
    );
  },
);

const staticStyles = StyleSheet.create({
  section: {
    gap: spacing.M,
  },
});

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionTitle: {
      color: theme.text.primary,
      marginBottom: spacing.XS,
    },
  });
