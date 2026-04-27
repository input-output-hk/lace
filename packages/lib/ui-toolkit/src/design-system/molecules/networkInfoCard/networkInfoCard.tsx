import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Card, Column, Row, Text, Shimmer } from '../../atoms';
import { isWeb } from '../../util';

import type { Theme } from '../../../design-tokens';

export type NetworkInfoCardProps = {
  currentEpochValue?: string;
  endEpochValue?: string;
  totalPoolsValue?: string;
  stakedValue?: string;
};

export const NetworkInfoCard = ({
  currentEpochValue,
  endEpochValue,
  totalPoolsValue,
  stakedValue,
}: NetworkInfoCardProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const style = styles(theme);

  const copies = {
    currentEpochTitle: t(
      'v2.pages.browse-pool.network-info-card.element.current',
    ),
    endEpochTitle: t('v2.pages.browse-pool.network-info-card.element.end'),
    totalPoolsTitle: t(
      'v2.pages.browse-pool.network-info-card.element.total-pools',
    ),
    stakedTitle: t('v2.pages.browse-pool.network-info-card.element.staked'),
  };

  const { currentEpochTitle, endEpochTitle, totalPoolsTitle, stakedTitle } =
    copies;

  const CardElement = ({
    title,
    value,
    flexValue,
  }: {
    title: string;
    value?: string;
    flexValue?: number;
  }) => (
    <Column
      style={[
        styles(theme).elementColumn,
        flexValue ? { flex: flexValue } : undefined,
      ]}>
      <Text.XS variant="secondary">{title}</Text.XS>
      {value !== undefined ? (
        <Text.M variant="primary" numberOfLines={1}>
          {value}
        </Text.M>
      ) : (
        <Shimmer.M width="medium" />
      )}
    </Column>
  );

  return (
    <Card cardStyle={style.card} blur={!isWeb}>
      <Text.M>{t('v2.pages.browse-pool.network-info-card.title')}</Text.M>

      <Column style={style.elementsWrapper}>
        <Row alignItems="center" justifyContent="space-between">
          <Column gap={spacing.M}>
            <CardElement title={currentEpochTitle} value={currentEpochValue} />
            <CardElement title={totalPoolsTitle} value={totalPoolsValue} />
          </Column>
          <Column gap={spacing.M}>
            <CardElement title={stakedTitle} value={stakedValue} />
            <CardElement title={endEpochTitle} value={endEpochValue} />
          </Column>
        </Row>
      </Column>
    </Card>
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.background.primary,
      padding: spacing.L,
      gap: spacing.M,
    },
    elementsWrapper: {
      gap: spacing.L,
    },
    elementColumn: {
      flex: 0.3,
    },
  });
