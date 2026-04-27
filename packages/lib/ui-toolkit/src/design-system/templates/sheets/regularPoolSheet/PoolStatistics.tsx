import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Divider, Row, Text, Column } from '../../../atoms';
import { ProgressBar } from '../../../molecules';

import type { Theme } from '../../../../design-tokens';

type PoolStatisticsProps = {
  saturationPercentage: number;
  activeStake: string;
  liveStake: string;
  delegators: string;
  blocks: string;
  costPerEpoch: string;
  pledge: string;
  poolMargin: string;
  ros: string;
  information: string;
  coin: string;
};

export const PoolStatistics: React.FC<PoolStatisticsProps> = ({
  saturationPercentage,
  activeStake,
  liveStake,
  delegators,
  blocks,
  costPerEpoch,
  pledge,
  poolMargin,
  ros,
  information,
  coin,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <>
      <View style={styles.saturationSection}>
        <Row justifyContent="space-between">
          <Text.XS variant="secondary">
            {t('v2.regular-pool.saturation')}
          </Text.XS>
          <Text.XS variant="primary">{saturationPercentage}%</Text.XS>
        </Row>
        <ProgressBar
          progress={saturationPercentage}
          color="positive"
          style={styles.progressBar}
        />
      </View>

      <View style={styles.statisticsSection}>
        <Text.M variant="primary">
          {t('v2.regular-pool.pool-statistics')}
        </Text.M>

        <View style={styles.statisticsGrid}>
          <Row style={styles.statisticsRow}>
            <Column style={styles.statisticColumn}>
              <Text.XS variant="secondary">
                {t('v2.regular-pool.active-stake')}
              </Text.XS>
              <Text.XS variant="primary">
                {activeStake} {coin}
              </Text.XS>
            </Column>
            <View style={styles.verticalDivider} />
            <Column style={styles.statisticColumn}>
              <Text.XS variant="secondary">
                {t('v2.regular-pool.live-stake')}
              </Text.XS>
              <Text.XS variant="primary">
                {liveStake} {coin}
              </Text.XS>
            </Column>
          </Row>

          <Divider />

          <Row style={styles.statisticsRow}>
            <Column style={styles.statisticColumn}>
              <Text.XS variant="secondary">
                {t('v2.regular-pool.delegators')}
              </Text.XS>
              <Text.XS variant="primary">{delegators}</Text.XS>
            </Column>
            <View style={styles.verticalDivider} />
            <Column style={styles.statisticColumn}>
              <Text.XS variant="secondary">
                {t('v2.regular-pool.blocks')}
              </Text.XS>
              <Text.XS variant="primary">{blocks}</Text.XS>
            </Column>
          </Row>

          <Divider />

          <Row style={styles.statisticsRow}>
            <Column style={styles.statisticColumn}>
              <Text.XS variant="secondary">
                {t('v2.regular-pool.cost-per-epoch')}
              </Text.XS>
              <Text.XS variant="primary">
                {costPerEpoch} {coin}
              </Text.XS>
            </Column>
            <View style={styles.verticalDivider} />
            <Column style={styles.statisticColumn}>
              <Text.XS variant="secondary">
                {t('v2.regular-pool.pledge')}
              </Text.XS>
              <Text.XS variant="primary">
                {pledge} {coin}
              </Text.XS>
            </Column>
          </Row>

          <Divider />

          <Row style={styles.statisticsRow}>
            <Column style={styles.statisticColumn}>
              <Text.XS variant="secondary">
                {t('v2.regular-pool.pool-margin')}
              </Text.XS>
              <Text.XS variant="primary">{poolMargin}</Text.XS>
            </Column>
            <View style={styles.verticalDivider} />
            <Column style={styles.statisticColumn}>
              <Text.XS variant="secondary">{t('v2.regular-pool.ros')}</Text.XS>
              <Text.XS variant="primary">{ros}</Text.XS>
            </Column>
          </Row>
        </View>
      </View>

      <View style={styles.dividerContainer}>
        <Divider />
      </View>

      <View style={styles.informationSection}>
        <Text.M variant="primary">{t('v2.regular-pool.information')}</Text.M>
        <Text.S variant="secondary">{information}</Text.S>
      </View>

      <View style={styles.dividerContainer}>
        <Divider />
      </View>
    </>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    saturationSection: {
      width: '100%',
      marginTop: spacing.M,
      marginBottom: spacing.XL,
      gap: spacing.XS,
    },
    progressBar: {
      marginVertical: spacing.XS,
    },
    statisticsSection: {
      width: '100%',
      marginVertical: spacing.M,
      gap: spacing.M,
    },
    statisticsGrid: {
      width: '100%',
      gap: spacing.S,
    },
    statisticsRow: {
      width: '100%',
      justifyContent: 'space-between',
    },
    statisticColumn: {
      flex: 1,
      gap: spacing.XS,
    },
    verticalDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: theme.background.tertiary,
      marginHorizontal: spacing.M,
    },
    informationSection: {
      width: '100%',
      marginVertical: spacing.M,
      gap: spacing.S,
    },
    dividerContainer: {
      marginTop: spacing.M,
      width: '100%',
    },
  });
