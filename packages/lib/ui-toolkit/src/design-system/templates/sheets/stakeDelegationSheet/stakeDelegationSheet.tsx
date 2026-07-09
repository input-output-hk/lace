import type { ImageSourcePropType } from 'react-native';

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Divider } from '../../../atoms';
import { footerHeight, Sheet } from '../../../organisms';
import {
  getSaturationColor,
  getProgressBarColorForTheme,
} from '../../../util/color-utils';

import { PoolOverview } from './PoolOverview';
import { StakePoolDetails } from './StakePoolDetails';
import { TotalBreakdown } from './TotalBreakdown';

import type { ValueWithExchange } from '../../../molecules';

export interface StakeDelegationSheetProps {
  // Header
  headerTitle: string;

  // Pool Overview
  poolAvatarFallback: string;
  poolName: string;
  poolTicker: string;

  // Stake Pool Details
  stakeKeyLabel: string;
  stakeKey: string;
  saturationLabel: string;
  saturationPercentage: number;
  marginLabel: string;
  margin: string;
  pledgeLabel: string;
  pledge: ValueWithExchange;
  costLabel: string;
  cost: ValueWithExchange;
  delegatedStakeLabel: string;
  delegatedStake: ValueWithExchange;
  sourceAccountLabel: string;
  sourceAccount: {
    name: string;
    avatar?: ImageSourcePropType;
    avatarFallback?: string;
  };
  expiresByLabel: string;
  expiresBy: {
    date: string;
    time: string;
  };

  // Total Breakdown
  totalBreakdownLabel: string;
  stakeKeyDepositLabel?: string;
  stakeKeyDepositAda?: string;
  stakeKeyDepositReturnLabel?: string;
  stakeKeyDepositReturnAda?: string;
  transactionFeeLabel: string;
  transactionFeeAda: string;
  totalLabel: string;
  totalAda: string;

  // Actions
  onCancelPress: () => void;
  onDelegatePress: () => void;
  cancelButtonLabel: string;
  delegateButtonLabel: string;
}

export const StakeDelegationSheet = ({
  poolAvatarFallback,
  poolName,
  poolTicker,
  stakeKeyLabel,
  stakeKey,
  saturationLabel,
  saturationPercentage,
  marginLabel,
  margin,
  pledgeLabel,
  pledge,
  costLabel,
  cost,
  delegatedStakeLabel,
  delegatedStake,
  sourceAccountLabel,
  sourceAccount,
  expiresByLabel,
  expiresBy,
  totalBreakdownLabel,
  stakeKeyDepositLabel,
  stakeKeyDepositAda,
  stakeKeyDepositReturnLabel,
  stakeKeyDepositReturnAda,
  transactionFeeLabel,
  transactionFeeAda,
  totalLabel,
  totalAda,
}: StakeDelegationSheetProps) => {
  const { theme } = useTheme();
  const defaultStyles = useMemo(() => styles(), []);
  const saturationColor = useMemo(
    () => getSaturationColor(saturationPercentage),
    [saturationPercentage],
  );

  const saturationTextStyle = useMemo(
    () => ({
      color: getProgressBarColorForTheme(saturationColor, theme),
    }),
    [saturationColor, theme],
  );

  return (
    <Sheet.Scroll contentContainerStyle={defaultStyles.sheetContent}>
      <PoolOverview
        poolAvatarFallback={poolAvatarFallback}
        poolName={poolName}
        poolTicker={poolTicker}
      />

      <Divider />

      <StakePoolDetails
        stakeKey={{
          label: stakeKeyLabel,
          value: stakeKey,
        }}
        saturation={{
          label: saturationLabel,
          percentage: saturationPercentage,
          color: saturationColor,
        }}
        margin={{
          label: marginLabel,
          value: margin,
        }}
        pledge={{
          label: pledgeLabel,
          value: pledge,
        }}
        cost={{
          label: costLabel,
          value: cost,
        }}
        delegatedStake={{
          label: delegatedStakeLabel,
          value: delegatedStake,
        }}
        sourceAccount={{
          label: sourceAccountLabel,
          account: sourceAccount,
        }}
        expiresBy={{
          label: expiresByLabel,
          value: expiresBy,
        }}
        styleProps={{ saturationTextStyle }}
      />

      <Divider />

      <TotalBreakdown
        totalBreakdownLabel={totalBreakdownLabel}
        stakeKeyDepositLabel={stakeKeyDepositLabel}
        stakeKeyDepositAda={stakeKeyDepositAda}
        stakeKeyDepositReturnLabel={stakeKeyDepositReturnLabel}
        stakeKeyDepositReturnAda={stakeKeyDepositReturnAda}
        transactionFeeLabel={transactionFeeLabel}
        transactionFeeAda={transactionFeeAda}
        totalLabel={totalLabel}
        totalAda={totalAda}
      />
    </Sheet.Scroll>
  );
};

const styles = () =>
  StyleSheet.create({
    sheetContent: {
      gap: spacing.L,
      padding: spacing.L,
      paddingBottom: footerHeight.horizontal,
    },
  });
