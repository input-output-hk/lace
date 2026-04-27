import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Column, Divider, Row, Text } from '../../atoms';

import type { Theme } from '../../../design-tokens';

export type DappDetailsStatisticsSectionProps = {
  title: string;
  subtitle?: string;
  labels: {
    transactions: string;
    volume: string;
    users: string;
  };
  values: {
    transactions: string;
    volume: string;
    users: string;
  };
};

const StatColumn = memo(
  ({
    label,
    value,
    isMiddle = false,
  }: {
    label: string;
    value: string;
    isMiddle?: boolean;
  }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const statColumnStyle = isMiddle
      ? [staticStyles.statColumn, styles.statColumnMiddle]
      : staticStyles.statColumn;

    return (
      <Column style={statColumnStyle}>
        <Text.XS>{label}</Text.XS>
        <Text.S>{value}</Text.S>
      </Column>
    );
  },
);

export const DappDetailsStatisticsSection = memo(
  ({ title, subtitle, labels, values }: DappDetailsStatisticsSectionProps) => {
    return (
      <Column>
        <Divider />
        <Row justifyContent="space-between">
          <Text.M>{title}</Text.M>
          {!!subtitle && <Text.XS>{subtitle}</Text.XS>}
        </Row>
        <Row justifyContent="space-between" style={staticStyles.statRow}>
          <StatColumn label={labels.transactions} value={values.transactions} />
          <StatColumn label={labels.volume} value={values.volume} isMiddle />
          <StatColumn label={labels.users} value={values.users} />
        </Row>
      </Column>
    );
  },
);

const staticStyles = StyleSheet.create({
  statRow: {
    gap: spacing.S,
  },
  statColumn: {
    flexBasis: '33%',
  },
});

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    statColumnMiddle: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderLeftWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: spacing.S,
      borderColor: theme.border.top,
    },
  });
