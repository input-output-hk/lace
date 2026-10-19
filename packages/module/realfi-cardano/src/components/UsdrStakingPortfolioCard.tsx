import { useTranslation } from '@lace-contract/i18n';
import {
  Button,
  Card,
  Column,
  Divider,
  Row,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

export type UsdrStakingPortfolioCardProps = {
  /** Total portfolio balance in fiat (e.g. "0.00"). */
  totalBalance: string;
  /** Fiat currency ticker rendered next to the total balance. */
  currency?: string;
  /** Staked balance amount (e.g. "0.00"). */
  stakedBalance: string;
  /** Available-to-stake amount (e.g. "0.00"). */
  availableToStake: string;
  /** Ticker rendered next to the staked balance (e.g. "sUSDrf"). */
  ticker?: string;
  /** Ticker rendered next to available-to-stake (e.g. "USDrf"); defaults to `ticker`. */
  availableTicker?: string;
  /** Yield tag centred under the balances (e.g. "+4.7% APY"); hidden when absent. */
  apyTag?: string;
  /** Lifetime yield in fiat (e.g. "0.04"), beside Total Balance in `currency`; hidden when absent. */
  yieldEarned?: string;
  onManageStake: () => void;
  testID?: string;
};

/**
 * Portfolio-style summary card for the USDr Staking sheet. Mirrors the home
 * portfolio card (background, shadow): Total Balance beside Yield Earned, a
 * Staked Balance / Available to Stake split styled after the stake card's
 * staked-balance row, the APY tag centred beneath, then a full-width "Manage
 * Stake" CTA. Purely presentational — every value is supplied via props.
 */
export const UsdrStakingPortfolioCard = ({
  totalBalance,
  currency = 'USD',
  stakedBalance,
  availableToStake,
  ticker = 'sUSDrf',
  availableTicker,
  apyTag,
  yieldEarned,
  onManageStake,
  testID = 'usdr-staking-portfolio-card',
}: UsdrStakingPortfolioCardProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const amounts = useMemo(
    () => [
      {
        key: 'staked',
        label: t('realfi.detail.staked-balance'),
        value: stakedBalance,
        ticker,
        testID: `${testID}-staked-balance`,
      },
      {
        key: 'available',
        label: t('realfi.detail.available-to-stake'),
        value: availableToStake,
        ticker: availableTicker ?? ticker,
        testID: `${testID}-available-to-stake`,
      },
    ],
    [t, stakedBalance, availableToStake, ticker, availableTicker, testID],
  );

  return (
    <Card testID={testID} cardStyle={styles.card}>
      <Row alignItems="center">
        <Column gap={spacing.XS} style={styles.amountSection}>
          <Text.M variant="secondary">
            {t('realfi.detail.total-balance')}
          </Text.M>
          <Row alignItems="center" gap={spacing.XS} style={styles.valueRow}>
            <Text.L testID={`${testID}-total-balance`}>{totalBalance}</Text.L>
            <Text.S variant="secondary">{currency}</Text.S>
          </Row>
        </Column>
        {yieldEarned !== undefined && (
          <Column gap={spacing.XS} style={styles.amountSection}>
            <Text.M variant="secondary">
              {t('realfi.detail.yield-earned')}
            </Text.M>
            <Row alignItems="center" gap={spacing.XS} style={styles.valueRow}>
              <Text.L testID={`${testID}-yield-earned`}>{yieldEarned}</Text.L>
              <Text.S variant="secondary">{currency}</Text.S>
            </Row>
          </Column>
        )}
      </Row>
      <Row alignItems="center">
        {amounts.map(amount => (
          <Column
            key={amount.key}
            gap={spacing.XS}
            style={styles.amountSection}>
            <Text.XS variant="secondary">{amount.label}</Text.XS>
            <Row alignItems="center" gap={spacing.XS} style={styles.valueRow}>
              <Text.L testID={amount.testID}>{amount.value}</Text.L>
              <Text.XS variant="secondary">{amount.ticker}</Text.XS>
            </Row>
          </Column>
        ))}
      </Row>
      {apyTag !== undefined && (
        <Row justifyContent="center">
          <View style={styles.apyTag} testID={`${testID}-apy-tag`}>
            <Text.XS style={styles.apyTagLabel}>{apyTag}</Text.XS>
          </View>
        </Row>
      )}

      <Divider />
      <Button.Primary
        label={t('realfi.detail.manage-stake')}
        onPress={onManageStake}
        fullWidth
        testID={`${testID}-manage-stake`}
      />
    </Card>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    // Match the home portfolio card surface (background.primary + drop shadow,
    // no border) instead of the default Card surface.
    card: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      borderWidth: 0,
      gap: spacing.M,
      boxShadow: `0 0 10px 0 ${theme.extra.shadowDrop}`,
      shadowColor: theme.extra.shadowDrop,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    // Split the two amounts evenly (each half-width) so the gap matches the
    // Total staked / Total unstaked layout in the staking-center rewards card.
    amountSection: {
      flex: 1,
    },
    // Half-width columns: a long fiat total (e.g. JPY) wraps its ticker onto
    // the next line instead of overflowing into the neighbouring column.
    valueRow: {
      flexWrap: 'wrap',
    },
    // Positive-emphasis pill: data.positive text on a ~10%-alpha wash of the
    // same color (hex8 suffix), matching the design system's positive data color.
    apyTag: {
      backgroundColor: `${theme.data.positive}1A`,
      borderRadius: radius.rounded,
      paddingHorizontal: spacing.S,
      paddingVertical: spacing.XS,
    },
    apyTagLabel: {
      color: theme.data.positive,
    },
  });
