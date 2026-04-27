import type { ReactNode } from 'react';

import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Divider, Row } from '../../../atoms';
import { getIsWideLayout } from '../../../util';
import { AccountInfo } from '../../accountInfo/accountInfo';

interface AlternativeCardProps {
  alternativeType: 'enhanced' | 'simple';
  bottom: ReactNode;
  data?: {
    wallets: {
      icon: React.ReactElement | { uri: string };
    }[];
    accounts: {
      name: string;
      icon: React.ReactElement | { uri: string };
    }[];
  };
  price?: ReactNode;
  chart?: ReactNode;
  tabs?: ReactNode;
  portfolioHeader?: ReactNode;
}

export const AlternativeCard = ({
  alternativeType,
  bottom,
  data,
  price,
  chart,
  tabs,
  portfolioHeader,
}: AlternativeCardProps) => {
  const isSimple = alternativeType === 'simple';
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = getIsWideLayout(windowWidth);

  const styles = useMemo(() => getStyles(isWideLayout), [isWideLayout]);

  return (
    <Column style={styles.content} justifyContent="space-between">
      <Row
        justifyContent="space-between"
        alignItems={'center'}
        style={styles.header}>
        <Column>
          {portfolioHeader}
          <AccountInfo
            wallets={data?.wallets || []}
            accounts={data?.accounts || []}
            showLabels={!isSimple}
          />
        </Column>

        {!!price && price}
      </Row>

      <Column style={styles.chartContainer}>
        {chart}
        {!isSimple && tabs && (
          <Row justifyContent="center" style={styles.enhancedTabsWrapper}>
            {tabs}
          </Row>
        )}
      </Column>
      <Divider />
      {bottom}
    </Column>
  );
};

const getStyles = (isWideLayout: boolean) => {
  return StyleSheet.create({
    content: {
      padding: spacing.S,
      gap: spacing.S,
    },
    header: {
      marginBottom: spacing.M,
    },
    chartContainer: {
      gap: spacing.S,
      width: '100%',
      height: 90,
      marginBottom: spacing.M,
    },
    enhancedTabsWrapper: {
      alignSelf: 'center',
      width: isWideLayout ? '50%' : '65%',
    },
  });
};
