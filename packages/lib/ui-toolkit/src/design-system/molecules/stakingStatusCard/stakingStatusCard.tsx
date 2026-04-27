import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Card, Column, Row, Shimmer, Text } from '../../atoms';
import { getAmountParts, getEarnedRewards } from '../../util';

import type { Theme } from '../../../design-tokens';

export type StakingStatusCardStatus = 'loading' | 'staked' | 'unstaked';

export type StakingStatusCardProps = {
  status: StakingStatusCardStatus;
  totalEarned?: string;
  totalStaked?: string;
  totalUnstaked?: string;
};

export const StakingStatusCard = ({
  status,
  totalEarned,
  totalStaked,
  totalUnstaked,
}: StakingStatusCardProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const style = styles(theme);
  const hasEarnedRewards = useMemo(() => {
    if (!totalEarned) return false;

    return getEarnedRewards(totalEarned);
  }, [totalEarned]);

  const statusTitle = useMemo(() => {
    switch (status) {
      case 'loading':
        return null;
      case 'staked':
        return t('v2.generic.staking.card.total.earned');
      case 'unstaked':
        return t('v2.generic.staking.card.total.unstaked');
    }
  }, [status, t]);

  const mainAmount = useMemo(() => {
    switch (status) {
      case 'loading':
        return null;
      case 'staked':
        return totalEarned;
      case 'unstaked':
        return totalUnstaked;
    }
  }, [status, totalEarned, totalUnstaked]);
  const amountParts = useMemo(() => {
    return getAmountParts(mainAmount);
  }, [mainAmount]);

  const footerContent = useMemo(() => {
    switch (status) {
      case 'loading':
        return null;
      case 'staked':
        return (
          <Row alignItems="center">
            <View style={style.amountSection}>
              <Text.XS
                variant="secondary"
                testID="staking-summary-total-staked-label">
                {t('v2.generic.staking.card.total.staked')}
              </Text.XS>
              <Text.S testID="staking-summary-total-staked-value">
                {totalStaked}
              </Text.S>
            </View>
            <View style={style.amountSection}>
              <Text.XS
                variant="secondary"
                testID="staking-summary-total-unstaked-label">
                {t('v2.generic.staking.card.total.unstaked')}
              </Text.XS>
              <Text.S testID="staking-summary-total-unstaked-value">
                {totalUnstaked}
              </Text.S>
            </View>
          </Row>
        );
      case 'unstaked':
        return (
          <Text.XS variant="secondary" testID="staking-summary-instruction">
            {t('v2.generic.staking.card.instruction')}
          </Text.XS>
        );
    }
  }, [status, totalStaked, totalUnstaked, t, style]);

  if (status === 'loading') {
    return (
      <Card cardStyle={style.card}>
        <Shimmer.M />
        <View>
          <Row alignItems="center">
            <Shimmer.S />
          </Row>
          <Row alignItems="center">
            <Shimmer.L />
          </Row>
          <Row alignItems="center">
            <View style={style.amountSection}>
              <Shimmer.XS />
              <Shimmer.S />
            </View>
            <View style={style.amountSection}>
              <Shimmer.XS />
              <Shimmer.S />
            </View>
          </Row>
        </View>
      </Card>
    );
  }

  return (
    <Card cardStyle={style.card}>
      <Column>
        <Row alignItems="center" gap={spacing.S}>
          <Text.XS
            variant="secondary"
            testID="staking-summary-total-rewards-earned-label">
            {statusTitle}
          </Text.XS>
        </Row>
        {hasEarnedRewards && amountParts.ticker ? (
          <Row alignItems="center" gap={spacing.XS}>
            <Text.XL
              style={style.earnedAmount}
              testID="staking-summary-total-rewards-earned-value">
              {amountParts.value}
            </Text.XL>
            <Text.XS
              style={style.earnedAmountTicker}
              testID="staking-summary-total-rewards-earned-ticker">
              {amountParts.ticker}
            </Text.XS>
          </Row>
        ) : (
          <Text.L testID="staking-summary-total-rewards-earned-value">
            {mainAmount}
          </Text.L>
        )}
      </Column>
      {footerContent}
    </Card>
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.background.primary,
      padding: spacing.L,
      gap: spacing.M,
      boxShadow: `0 0 10px 0 ${theme.extra.shadowDrop}`,
      shadowColor: theme.extra.shadowDrop,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    amountSection: {
      flex: 1,
    },
    earnedAmount: {
      color: theme.data.positive,
    },
    earnedAmountTicker: {
      color: theme.data.positive,
    },
  });
