import type { ReactNode } from 'react';

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Divider, Row } from '../../../atoms';
import { getIsWideLayout, isWeb } from '../../../util';
import { AccountInfo } from '../../accountInfo/accountInfo';

interface StandardCardProps {
  portfolioHeader: ReactNode;
  price?: ReactNode;
  chart: ReactNode;
  data?: {
    wallets: {
      icon: React.ReactElement | { uri: string };
    }[];
    accounts: {
      name: string;
      icon: React.ReactElement | { uri: string };
    }[];
  };
  renderActions: () => React.JSX.Element;
  tabs?: ReactNode;
}

export const StandardCard = ({
  portfolioHeader,
  renderActions,
  chart,
  data,
  price,
  tabs,
}: StandardCardProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = getIsWideLayout(windowWidth);

  const styles = useMemo(() => getStyles(isWideLayout), [isWideLayout]);

  return (
    <Column style={styles.content} alignItems="center">
      {portfolioHeader}
      <AccountInfo
        wallets={data?.wallets || []}
        accounts={data?.accounts || []}
        showLabels={false}
      />
      {!!price && price}
      <Divider />
      <Column gap={spacing.S} style={styles.bottom}>
        <View style={styles.chartContainer}>
          {chart}
          {!!tabs && <View style={styles.tabsWrapper}>{tabs}</View>}
        </View>
        <Divider />
        <Row justifyContent="space-between" style={styles.actionsRow}>
          {renderActions()}
        </Row>
      </Column>
    </Column>
  );
};

const getStyles = (isWideLayout: boolean) =>
  StyleSheet.create({
    content: {
      gap: spacing.XS,
    },
    chartContainer: {
      width: '100%',
      height: 90,
    },
    actionsRow: {
      width: isWeb ? '80%' : '100%',
      alignSelf: 'center',
    },
    tabsWrapper: {
      width: isWideLayout ? '50%' : '65%',
      alignSelf: 'center',
    },
    bottom: {
      width: '100%',
    },
  });
