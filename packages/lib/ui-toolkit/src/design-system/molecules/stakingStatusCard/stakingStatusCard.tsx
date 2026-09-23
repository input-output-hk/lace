import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getShadowStyle,
  radius,
  spacing,
  useTheme,
} from '../../../design-tokens';
import { Card, Column, Row, Shimmer, Text } from '../../atoms';
import { getAmountParts, getEarnedRewards } from '../../util';

import type { Theme } from '../../../design-tokens';

export type StakingStatusCardStatus = 'loading' | 'staked' | 'unstaked';

export type StakingStatusCardProps = {
  status: StakingStatusCardStatus;
  /** Overrides the status-derived heading (e.g. the hub's "Total Earned"). */
  title?: string;
  /**
   * Prefix for the summary testIDs. Surfaces that can coexist in the DOM
   * (the hub card stays mounted, hidden, under the pushed Cardano detail)
   * must use distinct prefixes or selectors match the hidden copy first.
   */
  testID?: string;
  totalEarned?: string;
  totalStaked?: string;
  totalUnstaked?: string;
};

export const StakingStatusCard = ({
  status,
  title,
  testID = 'staking-summary',
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
    if (title !== undefined) return title;
    switch (status) {
      case 'loading':
        return null;
      case 'staked':
        return t('v2.generic.staking.card.total.earned');
      case 'unstaked':
        return t('v2.generic.staking.card.total.unstaked');
    }
  }, [status, title, t]);

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
        // Consumers that carry only the headline figure (the hub's combined
        // Total Earned) omit the split — blank label/value rows must not render.
        if (totalStaked === undefined && totalUnstaked === undefined)
          return null;
        return (
          <Row alignItems="center">
            {totalStaked !== undefined && (
              <View style={style.amountSection}>
                <Text.XS
                  variant="secondary"
                  testID={`${testID}-total-staked-label`}>
                  {t('v2.generic.staking.card.total.staked')}
                </Text.XS>
                <Text.S testID={`${testID}-total-staked-value`}>
                  {totalStaked}
                </Text.S>
              </View>
            )}
            {totalUnstaked !== undefined && (
              <View style={style.amountSection}>
                <Text.XS
                  variant="secondary"
                  testID={`${testID}-total-unstaked-label`}>
                  {t('v2.generic.staking.card.total.unstaked')}
                </Text.XS>
                <Text.S testID={`${testID}-total-unstaked-value`}>
                  {totalUnstaked}
                </Text.S>
              </View>
            )}
          </Row>
        );
      case 'unstaked':
        return (
          <Text.XS variant="secondary" testID={`${testID}-instruction`}>
            {t('v2.generic.staking.card.instruction')}
          </Text.XS>
        );
    }
  }, [status, totalStaked, totalUnstaked, t, style, testID]);

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
            testID={`${testID}-total-rewards-earned-label`}>
            {statusTitle}
          </Text.XS>
        </Row>
        {hasEarnedRewards && amountParts.ticker ? (
          <Row alignItems="center" gap={spacing.XS}>
            <Text.XL
              style={style.earnedAmount}
              testID={`${testID}-total-rewards-earned-value`}>
              {amountParts.value}
            </Text.XL>
            <Text.XS
              style={style.earnedAmountTicker}
              testID={`${testID}-total-rewards-earned-ticker`}>
              {amountParts.ticker}
            </Text.XS>
          </Row>
        ) : (
          <Text.L testID={`${testID}-total-rewards-earned-value`}>
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
      borderRadius: radius.M,
      borderWidth: 0.5,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
      borderLeftColor: theme.border.middle,
      borderRightColor: theme.border.middle,
      overflow: 'visible',
      ...getShadowStyle({ theme, variant: 'card' }),
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
