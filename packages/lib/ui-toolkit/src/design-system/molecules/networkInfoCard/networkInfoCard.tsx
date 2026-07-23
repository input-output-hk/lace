import { useTranslation } from '@lace-contract/i18n';
import { formatEpochEnd } from '@lace-lib/util-render';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Card, Column, Row, Text, Shimmer } from '../../atoms';
import { isWeb } from '../../util';

import type { Theme } from '../../../design-tokens';

export type NetworkInfoCardProps = {
  currentEpochValue?: string;
  epochEndTimestamp?: number;
  totalPoolsValue?: string;
  stakedValue?: string;
};

const CardElement = ({
  title,
  value,
  flexValue,
}: {
  title: string;
  value?: string;
  flexValue?: number;
}) => {
  const { theme } = useTheme();
  return (
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
};

// Live epoch-end countdown. Owns its own 1s interval so each tick re-renders
// only this leaf, not the surrounding NetworkInfoCard / page subtree.
const EpochCountdown = ({
  title,
  timestamp,
}: {
  title: string;
  timestamp?: number;
}) => {
  const [value, setValue] = useState<string | undefined>(() =>
    timestamp === undefined ? undefined : formatEpochEnd(timestamp),
  );

  useEffect(() => {
    if (timestamp === undefined) {
      setValue(undefined);
      return;
    }
    setValue(formatEpochEnd(timestamp));
    const interval = setInterval(() => {
      setValue(formatEpochEnd(timestamp));
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [timestamp]);

  return <CardElement title={title} value={value} />;
};

export const NetworkInfoCard = ({
  currentEpochValue,
  epochEndTimestamp,
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

  return (
    <Card cardStyle={style.card} blur={!isWeb}>
      <Text.M>{t('v2.pages.browse-pool.network-info-card.title')}</Text.M>

      <Column style={style.elementsWrapper}>
        <Row alignItems="center" justifyContent="space-between">
          <Column gap={spacing.M} style={style.flexElement}>
            <CardElement title={currentEpochTitle} value={currentEpochValue} />
            <CardElement title={totalPoolsTitle} value={totalPoolsValue} />
          </Column>
          <Column gap={spacing.M} style={style.flexElement}>
            <CardElement title={stakedTitle} value={stakedValue} />
            <EpochCountdown
              title={endEpochTitle}
              timestamp={epochEndTimestamp}
            />
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
    flexElement: {
      flex: 1,
    },
  });
