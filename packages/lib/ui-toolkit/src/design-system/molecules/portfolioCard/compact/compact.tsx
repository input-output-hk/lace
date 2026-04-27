import type { ReactNode } from 'react';

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Row } from '../../../atoms';

interface CompactCardProps {
  portfolioHeader: ReactNode;
  price: ReactNode;
  chart: ReactNode;
}

export const CompactCard = ({
  portfolioHeader,
  price,
  chart,
}: CompactCardProps) => (
  <Row justifyContent="space-between">
    <Column>
      {portfolioHeader}
      {price}
    </Column>
    <View style={styles.compactChartWrapper}>{chart}</View>
  </Row>
);

const styles = StyleSheet.create({
  compactChartWrapper: {
    alignItems: 'center',
    maxHeight: 150,
    padding: spacing.S,
    flex: 1,
  },
});
