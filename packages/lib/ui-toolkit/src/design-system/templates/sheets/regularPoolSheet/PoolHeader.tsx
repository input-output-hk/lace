import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Avatar, Divider, Row, Text } from '../../../atoms';

import type { Theme } from '../../../../design-tokens';

type PoolHeaderProps = {
  poolName: string;
  poolTicker: string;
  totalStaked: string;
  totalRewards: string;
  coin: string;
  stakeKey: string;
};

export const PoolHeader: React.FC<PoolHeaderProps> = ({
  poolName,
  poolTicker,
  totalStaked,
  totalRewards,
  coin,
  stakeKey,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <>
      <View style={styles.avatarContainer}>
        <Avatar
          size={64}
          content={{ fallback: poolTicker.substring(0, 2) }}
          shape="rounded"
        />
      </View>

      <Text.M variant="primary">{poolName}</Text.M>
      <Text.S variant="secondary">{poolTicker}</Text.S>

      <View style={styles.dividerContainer}>
        <Divider />
      </View>

      <Row style={styles.amountsRow}>
        <View style={styles.amountColumn}>
          <Text.XS variant="secondary">
            {t('v2.regular-pool.total-staked')}
          </Text.XS>
          <Text.M variant="primary">
            {totalStaked} {coin}
          </Text.M>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.amountColumn}>
          <Text.XS variant="secondary">
            {t('v2.regular-pool.total-rewards')}
          </Text.XS>
          <Text.M variant="primary">
            {totalRewards} {coin}
          </Text.M>
        </View>
      </Row>

      <View style={styles.dividerContainer}>
        <Divider />
      </View>

      <View style={styles.stakeKeySection}>
        <Text.XS variant="secondary">{t('v2.regular-pool.stake-key')}</Text.XS>
        <Text.XS variant="primary">{stakeKey}</Text.XS>
      </View>
    </>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    avatarContainer: {
      marginBottom: spacing.M,
    },
    dividerContainer: {
      marginTop: spacing.M,
      width: '100%',
    },
    amountsRow: {
      width: '100%',
      marginVertical: spacing.M,
    },
    amountColumn: {
      flex: 1,
    },
    verticalDivider: {
      width: 1,
      height: '100%',
      backgroundColor: theme.background.tertiary,
      marginHorizontal: spacing.M,
    },
    stakeKeySection: {
      width: '100%',
      marginVertical: spacing.M,
      gap: spacing.XS,
    },
  });
