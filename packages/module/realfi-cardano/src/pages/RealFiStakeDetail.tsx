import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Avatar,
  Column,
  CustomTag,
  Divider,
  Row,
  Sheet,
  Text,
  hexToRgba,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import {
  formatAmountToLocale,
  formatDate,
  formatTime,
} from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type {
  RealFiActivityStepStatus,
  RealFiCancelStage,
  RealFiStakeActivity,
} from '@lace-contract/realfi-staking';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

// Stable selector param (avoids a fresh object identity every render).
const CARDANO_BLOCKCHAIN_PARAM = { blockchainName: 'Cardano' } as const;

// The pending order can be reclaimed at whichever leg it's on: cancel the
// swap (SundaeSwap) while it's still executing, otherwise cancel the RealFi
// stake order.
const cancelStageForActivity = (
  activity: RealFiStakeActivity,
): RealFiCancelStage => {
  const swapStep = activity.steps.find(step => step.key === 'swap');
  return swapStep && swapStep.status !== 'completed' ? 'swap' : 'stake';
};

const StakeDetailRow = ({
  label,
  value,
  testID,
}: {
  label: string;
  value: React.ReactNode;
  testID?: string;
}) => (
  <Row
    testID={testID}
    justifyContent="space-between"
    alignItems="center"
    gap={spacing.S}>
    <Text.M variant="secondary">{label}</Text.M>
    {typeof value === 'string' ? (
      <Text.M style={styles.value} numberOfLines={1}>
        {value}
      </Text.M>
    ) : (
      value
    )}
  </Row>
);

/**
 * Stake Detail sheet. Reached from the USDr Staking detail's "Staking
 * Activities" list. Resolves the tapped activity (one per user-signed tx) from
 * the activities cache and renders its amount + a progress stepper showing each
 * leg of the flow (swap → stake → received) and where it currently is.
 */
export const RealFiStakeDetail = (
  props: SheetScreenProps<SheetRoutes.RealFiStakeDetail>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { accountId, activityId } = props.route.params;
  const cancel = useDispatchLaceAction('realfiPosition.cancelRequested');

  const activityParams = useMemo(
    () => ({ accountId: accountId as AccountId, activityId }),
    [accountId, activityId],
  );
  const activity = useLaceSelector(
    'realfiPosition.selectStakeActivityById',
    activityParams,
  );

  // Account name + avatar resolved from the wallet store, like the review sheet.
  const accountsResult = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    CARDANO_BLOCKCHAIN_PARAM,
  );
  const accountMetadata = useMemo(() => {
    const accounts = Array.isArray(accountsResult) ? accountsResult : [];
    return accounts.find(account => account.accountId === accountId)?.metadata;
  }, [accountsResult, accountId]);
  const accountName = accountMetadata?.name ?? '';

  // Show cancel only while a leg is genuinely in flight — a settled flow has
  // nothing to reclaim, and a failed/canceled one holds no order UTxO to spend.
  const canCancel = activity?.steps.some(step => step.status === 'active');

  const onCancel = useCallback(() => {
    if (!activity) return;
    cancel({
      accountId: accountId as AccountId,
      orderId: activity.id,
      stage: cancelStageForActivity(activity),
    });
    NavigationControls.closeSheet();
  }, [activity, accountId, cancel]);

  const stepColor = useCallback(
    (status: RealFiActivityStepStatus): string => {
      if (status === 'completed') return theme.data.positive;
      if (status === 'failed') return theme.data.negative;
      if (status === 'active') return theme.text.primary;
      return theme.text.secondary;
    },
    [theme],
  );

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  const onBackPress = navigation.canGoBack() ? goBack : undefined;

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={
            activity?.kind === 'withdraw'
              ? t('realfi.stake-detail.title-claim')
              : t('realfi.stake-detail.title')
          }
          leftIconOnPress={onBackPress}
          handleClose={NavigationControls.closeSheet}
          testID="realfi-stake-detail-header"
        />
      ),
      footer: canCancel ? (
        <Sheet.Footer
          primaryButton={{
            label: t('realfi.stake-detail.cancel'),
            onPress: onCancel,
            testID: 'realfi-stake-detail-cancel',
          }}
        />
      ) : undefined,
    });
  }, [navigation, t, onBackPress, canCancel, onCancel, activity?.kind]);

  if (!activity) return null;

  let typeLabel = activity.label;
  if (activity.kind === 'unstake') {
    typeLabel = t('realfi.detail.activity.unstake');
  } else if (activity.kind === 'withdraw') {
    typeLabel = t('realfi.detail.activity.withdraw');
  }

  const fallbackAmountValue =
    activity.usdrBaseUnits === undefined
      ? activity.subtitle
      : `+${formatAmountToLocale(activity.usdrBaseUnits, 6)} USDrf`;
  const usdrLine = (baseUnits: string) =>
    `+${formatAmountToLocale(baseUnits, 6)} USDrf`;
  // A quoted swap→stake splits the amount in two: what the swap was quoted to
  // return, and what was actually staked, which can be lower. Until the stake
  // order is known, the staked amount is not shown as a figure.
  const hasQuote = activity.quotedUsdrBaseUnits !== undefined;
  let stakeAmountValue = fallbackAmountValue;
  if (activity.stakedUsdrBaseUnits !== undefined) {
    stakeAmountValue = usdrLine(activity.stakedUsdrBaseUnits);
  } else if (hasQuote) {
    stakeAmountValue = '—';
  }

  return (
    <Sheet.Scroll>
      <Column gap={spacing.M}>
        <StakeDetailRow
          testID="realfi-stake-detail-type"
          label={t('realfi.stake-detail.overview')}
          value={
            activity.completed ? (
              <Row alignItems="center" gap={spacing.S} style={styles.badgeRow}>
                <Text.M style={styles.value} numberOfLines={1}>
                  {typeLabel}
                </Text.M>
                <CustomTag
                  size="S"
                  color="positive"
                  backgroundType="colored"
                  backgroundColor={hexToRgba(theme.data.positive, 0.2)}
                  labelColor={theme.data.positive}
                  label={t('realfi.stake-detail.status.completed')}
                  testID="realfi-stake-detail-completed-badge"
                />
              </Row>
            ) : (
              typeLabel
            )
          }
        />
        <StakeDetailRow
          testID="realfi-stake-detail-account"
          label={t('realfi.stake-detail.account')}
          value={
            <CustomTag
              size="M"
              label={accountName}
              testID="realfi-stake-detail-account-name"
              icon={
                <Avatar
                  size={24}
                  shape="rounded"
                  content={
                    accountMetadata?.avatarUri
                      ? {
                          img: { uri: accountMetadata.avatarUri },
                          fallback: accountName.substring(0, 2).toUpperCase(),
                        }
                      : {
                          fallback: accountName.substring(0, 2).toUpperCase(),
                        }
                  }
                />
              }
              color="white"
            />
          }
        />
        {activity.quotedUsdrBaseUnits !== undefined && (
          <StakeDetailRow
            testID="realfi-stake-detail-quote-amount"
            label={t('realfi.stake-detail.quote-amount')}
            value={usdrLine(activity.quotedUsdrBaseUnits)}
          />
        )}
        <StakeDetailRow
          testID="realfi-stake-detail-amount"
          label={t(
            hasQuote
              ? 'realfi.stake-detail.staked-amount'
              : 'realfi.stake-detail.stake-amount',
          )}
          // Swap→stake rows show the USDr actually staked here and the input
          // token on the separate "Swap value" row below. Persisted rows format
          // their amount in the active locale from base units (P3-h);
          // read-derived rows keep their subtitle. USDr/sUSDr are both 6-decimal.
          value={stakeAmountValue}
        />
        {activity.swapInputLine !== undefined && (
          <StakeDetailRow
            testID="realfi-stake-detail-swap-value"
            label={t('realfi.stake-detail.swap-value')}
            value={activity.swapInputLine}
          />
        )}
        <StakeDetailRow
          testID="realfi-stake-detail-request-date"
          label={t('realfi.stake-detail.request-date')}
          value={formatDate({ date: activity.requestDate, type: 'local' })}
        />
        {/* Completion date once the activity is done (stake: executing-tx
            block time; unstake: cooldown end) — the Available-to-claim
            timestamp covers the mid-cooldown window before it (LW-14653). */}
        {activity.completedAt !== undefined ? (
          <StakeDetailRow
            testID="realfi-stake-detail-completion-date"
            label={t('realfi.stake-detail.completion-date')}
            value={formatDate({ date: activity.completedAt, type: 'local' })}
          />
        ) : (
          activity.kind === 'unstake' &&
          activity.claimableAt !== undefined && (
            <StakeDetailRow
              testID="realfi-stake-detail-available-to-claim"
              label={t('realfi.stake-detail.available-to-claim')}
              value={`${formatDate({
                date: activity.claimableAt,
                type: 'local',
              })} ${formatTime({ date: activity.claimableAt, type: 'local' })}`}
            />
          )
        )}

        <Divider />

        <Text.M variant="secondary">{t('realfi.stake-detail.steps')}</Text.M>
        <Column gap={spacing.S} testID="realfi-stake-detail-steps">
          {activity.steps.map(step => (
            <Row key={step.key} alignItems="center" gap={spacing.S}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: stepColor(step.status) },
                ]}
              />
              <Text.M>{t(`realfi.stake-detail.step.${step.key}`)}</Text.M>
              <Text.S variant="secondary" style={styles.stepStatus}>
                {t(`realfi.stake-detail.step-status.${step.status}`)}
              </Text.S>
            </Row>
          ))}
        </Column>
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
  badgeRow: {
    flexShrink: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepStatus: {
    marginLeft: 'auto',
  },
});
