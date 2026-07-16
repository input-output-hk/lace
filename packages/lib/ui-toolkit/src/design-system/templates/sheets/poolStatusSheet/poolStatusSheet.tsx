import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Avatar, Button, Divider, Row, Shimmer, Text } from '../../../atoms';
import { ProgressBar } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type {
  PoolStatusSheetProps,
  PoolStatusState,
} from './poolStatusSheet.types';
import type { Theme } from '../../../../design-tokens';

export const poolStatusSheetTestIds = {
  container: 'pool-status-sheet-container',
  poolName: 'pool-status-sheet-pool-name',
  poolTicker: 'pool-status-sheet-pool-ticker',
  primaryWarning: 'pool-status-sheet-primary-warning',
  saturationWarning: 'pool-status-sheet-saturation-warning',
  rewardsLockedSection: 'pool-status-sheet-rewards-locked-section',
  delegateVoteButton: 'pool-status-sheet-delegate-vote-button',
  primaryButton: 'pool-status-sheet-primary-button',
  secondaryButton: 'pool-status-sheet-secondary-button',
} as const;

// Helper functions to reduce complexity
const getWarningColorForState = (
  state: PoolStatusState,
  theme: Theme,
): string => {
  return state === 'pledge-not-met' ? theme.brand.yellow : theme.data.negative;
};

const getProgressBarColorForState = (
  state: PoolStatusState,
): 'negative' | 'positive' => {
  return state === 'pledge-not-met' ? 'positive' : 'negative';
};

export const PoolStatusSheet = (props: PoolStatusSheetProps) => {
  const {
    poolName,
    poolTicker,
    totalStaked,
    totalRewards,
    coin,
    state,
    primaryWarningMessage,
    saturationWarningMessage,
    stakeKey,
    saturationPercentage,
  } = props;
  const { t } = useTranslation();
  const { theme } = useTheme();

  const warningColor = getWarningColorForState(state, theme);
  const progressBarColor = getProgressBarColorForState(state);

  const styles = useMemo(
    () => getStyles(theme, warningColor),
    [theme, warningColor],
  );

  return (
    <Sheet.Scroll contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container} testID={poolStatusSheetTestIds.container}>
        <View style={styles.avatarContainer}>
          <Avatar
            size={64}
            content={{ fallback: poolTicker.substring(0, 2) }}
            shape="rounded"
          />
        </View>

        <Text.M variant="primary" testID={poolStatusSheetTestIds.poolName}>
          {poolName}
        </Text.M>

        <Text.S variant="secondary" testID={poolStatusSheetTestIds.poolTicker}>
          {poolTicker}
        </Text.S>

        {primaryWarningMessage && (
          <Text.S
            style={styles.primaryWarning}
            testID={poolStatusSheetTestIds.primaryWarning}>
            {primaryWarningMessage}
          </Text.S>
        )}

        <View style={styles.dividerContainer}>
          <Divider />
        </View>

        <Row
          style={styles.amountsRow}
          justifyContent="space-between"
          alignItems="flex-start">
          <View style={styles.amountColumn}>
            <Text.XS>{t('v2.pool-status.total-staked')}</Text.XS>
            <Row alignItems="center" gap={spacing.XS}>
              <Text.L>{totalStaked}</Text.L>
              <Text.XS>{coin}</Text.XS>
            </Row>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.amountColumn}>
            <Text.XS>{t('v2.pool-status.total-rewards')}</Text.XS>
            <Row alignItems="center" gap={spacing.XS}>
              <Text.L>{totalRewards}</Text.L>
              <Text.XS>{coin}</Text.XS>
            </Row>
          </View>
        </Row>

        <View style={styles.dividerContainer}>
          <Divider />
        </View>

        {stakeKey && (
          <View style={styles.stakeKeySection}>
            <Text.XS variant="secondary">
              {t('v2.pool-status.stake-key')}
            </Text.XS>
            <Text.S variant="primary">{stakeKey}</Text.S>
          </View>
        )}

        {stakeKey && (
          <View style={styles.dividerContainer}>
            <Divider />
          </View>
        )}

        <View style={styles.saturationSection}>
          <Text.S variant="secondary">{t('v2.pool-status.saturation')}</Text.S>
          <ProgressBar
            progress={saturationPercentage}
            color={progressBarColor}
            showPercentage={true}
            style={styles.progressBar}
          />

          {state === 'locked-rewards' && (
            <View
              style={styles.rewardsLockedSection}
              testID={poolStatusSheetTestIds.rewardsLockedSection}>
              <Row
                alignItems="center"
                justifyContent="space-between"
                style={styles.rewardsLockedHeader}>
                <Text.M>{t('v2.pool-status.rewards-locked')}</Text.M>
              </Row>
              {props.onDelegateVote && (
                <Button.Critical
                  label={t('v2.pool-status.delegate-vote')}
                  size="large"
                  onPress={props.onDelegateVote}
                  testID={poolStatusSheetTestIds.delegateVoteButton}
                />
              )}
            </View>
          )}

          {saturationWarningMessage && (
            <Text.S
              style={styles.warningText}
              testID={poolStatusSheetTestIds.saturationWarning}>
              {saturationWarningMessage}
            </Text.S>
          )}
        </View>
      </View>
    </Sheet.Scroll>
  );
};

export const PoolStatusSheetSkeleton = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme, theme.text.secondary), [theme]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container} testID={poolStatusSheetTestIds.container}>
        <View style={styles.avatarContainer}>
          <Shimmer width={64} height={64} borderRadius={16} />
        </View>

        <Shimmer.M width="long" />
        <Shimmer.S width="short" />

        <View style={styles.dividerContainer}>
          <Divider />
        </View>

        <Row
          style={styles.amountsRow}
          justifyContent="space-between"
          alignItems="flex-start">
          <View style={styles.amountColumn}>
            <Shimmer.XS width="medium" />
            <Shimmer.L width="medium" />
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.amountColumn}>
            <Shimmer.XS width="medium" />
            <Shimmer.L width="medium" />
          </View>
        </Row>

        <View style={styles.dividerContainer}>
          <Divider />
        </View>

        <View style={styles.stakeKeySection}>
          <Shimmer.XS width="short" />
          <Shimmer.S width="long" />
        </View>

        <View style={styles.dividerContainer}>
          <Divider />
        </View>

        <View style={styles.saturationSection}>
          <Shimmer.S width="short" />
          <Shimmer width={320} height={18} borderRadius={8} />
        </View>
      </View>
    </Sheet.Scroll>
  );
};

const getStyles = (theme: Theme, warningColor: string) =>
  StyleSheet.create({
    scrollContainer: {
      marginHorizontal: spacing.S,
      paddingBottom: spacing.XL,
    },
    container: {
      alignItems: 'center',
      paddingTop: spacing.M,
    },
    avatarContainer: {
      marginBottom: spacing.M,
    },
    primaryWarning: {
      textAlign: 'center',
      marginVertical: spacing.M,
      color: warningColor,
    },
    warningText: {
      color: warningColor,
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
    saturationSection: {
      width: '100%',
      marginTop: spacing.M,
      marginBottom: spacing.XL,
      gap: spacing.XS,
    },
    progressBar: {
      marginTop: spacing.XS,
      marginBottom: spacing.XS,
    },
    rewardsLockedSection: {
      width: '100%',
      marginVertical: spacing.M,
      gap: spacing.M,
    },
    rewardsLockedHeader: {
      width: '100%',
    },
  });
