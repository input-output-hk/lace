import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Avatar, Button, Divider, Row, Shimmer, Text } from '../../../atoms';
import {
  ProgressBar,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
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
    primaryButtonLabel,
    secondaryButtonLabel,
    isSecondaryButtonDisabled,
    onPrimaryPress,
    onSecondaryPress,
  } = props;
  const { t } = useTranslation();
  const { theme } = useTheme();

  const warningColor = getWarningColorForState(state, theme);
  const progressBarColor = getProgressBarColorForState(state);

  const hasFooterButtons = Boolean(
    (primaryButtonLabel && onPrimaryPress) ||
      (secondaryButtonLabel && onSecondaryPress),
  );

  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(theme, warningColor, hasFooterButtons ? footerHeight : 0),
    [theme, warningColor, hasFooterButtons, footerHeight],
  );

  return (
    <>
      <SheetHeader title={t('v2.pool-status.title')} />
      <Sheet.Scroll contentContainerStyle={styles.scrollContainer}>
        <View
          style={styles.container}
          testID={poolStatusSheetTestIds.container}>
          {/* Avatar with initials */}
          <View style={styles.avatarContainer}>
            <Avatar
              size={64}
              content={{ fallback: poolTicker.substring(0, 2) }}
              shape="rounded"
            />
          </View>

          {/* Pool name - 16px primary */}
          <Text.M variant="primary" testID={poolStatusSheetTestIds.poolName}>
            {poolName}
          </Text.M>

          {/* Pool ticker - 14px secondary */}
          <Text.S
            variant="secondary"
            testID={poolStatusSheetTestIds.poolTicker}>
            {poolTicker}
          </Text.S>

          {/* Primary warning message */}
          {primaryWarningMessage && (
            <Text.S
              style={styles.primaryWarning}
              testID={poolStatusSheetTestIds.primaryWarning}>
              {primaryWarningMessage}
            </Text.S>
          )}

          {/* Divider above amounts */}
          <View style={styles.dividerContainer}>
            <Divider />
          </View>

          {/* Amounts section */}
          <Row
            style={styles.amountsRow}
            justifyContent="space-between"
            alignItems="flex-start">
            {/* Total Staked */}
            <View style={styles.amountColumn}>
              <Text.XS>{t('v2.pool-status.total-staked')}</Text.XS>
              <Row alignItems="center" gap={spacing.XS}>
                <Text.L>{totalStaked}</Text.L>
                <Text.XS>{coin}</Text.XS>
              </Row>
            </View>

            {/* Vertical Divider */}
            <View style={styles.verticalDivider} />

            {/* Total Rewards */}
            <View style={styles.amountColumn}>
              <Text.XS>{t('v2.pool-status.total-rewards')}</Text.XS>
              <Row alignItems="center" gap={spacing.XS}>
                <Text.L>{totalRewards}</Text.L>
                <Text.XS>{coin}</Text.XS>
              </Row>
            </View>
          </Row>

          {/* Divider below amounts */}
          <View style={styles.dividerContainer}>
            <Divider />
          </View>

          {/* Stake key */}
          {stakeKey && (
            <View style={styles.stakeKeySection}>
              <Text.XS variant="secondary">
                {t('v2.pool-status.stake-key')}
              </Text.XS>
              <Text.S variant="primary">{stakeKey}</Text.S>
            </View>
          )}

          {/* Divider between stake key and saturation */}
          {stakeKey && (
            <View style={styles.dividerContainer}>
              <Divider />
            </View>
          )}

          {/* Saturation section */}
          <View style={styles.saturationSection}>
            <Text.S variant="secondary">
              {t('v2.pool-status.saturation')}
            </Text.S>
            <ProgressBar
              progress={saturationPercentage}
              color={progressBarColor}
              showPercentage={true}
              style={styles.progressBar}
            />

            {/* Rewards Locked section - only for locked-rewards state */}
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
                <Button.Critical
                  label={t('v2.pool-status.delegate-vote')}
                  size="large"
                  onPress={props.onDelegateVote}
                  testID={poolStatusSheetTestIds.delegateVoteButton}
                />
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
      {hasFooterButtons && (
        <SheetFooter
          showDivider={false}
          secondaryButton={
            secondaryButtonLabel && onSecondaryPress
              ? {
                  label: secondaryButtonLabel,
                  onPress: onSecondaryPress,
                  disabled: isSecondaryButtonDisabled,
                  testID: poolStatusSheetTestIds.secondaryButton,
                }
              : undefined
          }
          primaryButton={
            primaryButtonLabel && onPrimaryPress
              ? {
                  label: primaryButtonLabel,
                  onPress: onPrimaryPress,
                  testID: poolStatusSheetTestIds.primaryButton,
                }
              : undefined
          }
        />
      )}
    </>
  );
};

export const PoolStatusSheetSkeleton = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(
    () => getStyles(theme, theme.text.secondary, 0),
    [theme],
  );

  return (
    <>
      <SheetHeader title={t('v2.pool-status.title')} />
      <Sheet.Scroll contentContainerStyle={styles.scrollContainer}>
        <View
          style={styles.container}
          testID={poolStatusSheetTestIds.container}>
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
    </>
  );
};

const getStyles = (theme: Theme, warningColor: string, paddingBottom: number) =>
  StyleSheet.create({
    scrollContainer: {
      marginLeft: spacing.S,
      marginRight: spacing.S,
      paddingBottom: paddingBottom || spacing.XL,
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
      marginTop: spacing.M,
      marginBottom: spacing.M,
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
      marginTop: spacing.M,
      marginBottom: spacing.M,
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
      marginTop: spacing.M,
      marginBottom: spacing.M,
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
      marginTop: spacing.M,
      marginBottom: spacing.M,
      gap: spacing.M,
    },
    rewardsLockedHeader: {
      width: '100%',
    },
  });
