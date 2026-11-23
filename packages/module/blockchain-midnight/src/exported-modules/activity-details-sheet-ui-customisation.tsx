import type { PropsWithChildren } from 'react';

import { ActivityType } from '@lace-contract/activities';
import { Trans, useTranslation } from '@lace-contract/i18n';
import {
  DUST_TOKEN_DECIMALS,
  getDustTokenTickerByNetwork,
} from '@lace-contract/midnight-context';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import {
  Column,
  CustomTag,
  formatTokenBalanceChanges as formatTokenBalanceChangesUtil,
  Icon,
  spacing,
  Text,
} from '@lace-lib/ui-toolkit';
import {
  createUICustomisation,
  formatAmountToLocale,
  formatDate,
  formatTime,
} from '@lace-lib/util-render';
import React, { useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ActivityDetailItem } from '../components/ActivityDetailItem';
import { useLaceSelector } from '../hooks';

import type {
  ActivityDetailsContentProps,
  ActivityDetailsSheetUICustomisation,
} from '@lace-contract/activities';
import type { TFunction } from '@lace-contract/i18n';
import type { NetworkType } from '@lace-contract/network';
import type { ColorType, IconName } from '@lace-lib/ui-toolkit';

const AccountOptionsLink = ({
  children,
  onPress,
}: PropsWithChildren<{ onPress: () => void }>) => {
  const { t } = useTranslation();
  const webProps =
    Platform.OS === 'web'
      ? {
          tabIndex: 0,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onPress();
            }
          },
        }
      : {};
  return (
    <Text.S
      {...webProps}
      style={styles.link}
      accessibilityRole="link"
      accessibilityLabel={t('midnight.fee-recovery.open-account-options')}
      onPress={onPress}
      testID="activity-details-open-account-options">
      {children}
    </Text.S>
  );
};

type ActivityStatusConfig = {
  icon: IconName;
  color: ColorType;
  statusKey: string;
};

const getActivityStatus = (
  type: ActivityType,
  t: TFunction,
): ActivityStatusConfig => {
  const defaultStatus: ActivityStatusConfig = {
    icon: 'InformationCircle',
    color: 'neutral',
    statusKey: t('activity.activity.status.unknown'),
  };
  const activityMap: Partial<Record<ActivityType, ActivityStatusConfig>> = {
    [ActivityType.Pending]: {
      icon: 'AlarmClock',
      color: 'black',
      statusKey: t('activity.activity.status.pending'),
    },
    [ActivityType.Send]: {
      icon: 'Tick',
      color: 'positive',
      statusKey: t('activity.activity.status.success'),
    },
    [ActivityType.Receive]: {
      icon: 'Tick',
      color: 'positive',
      statusKey: t('activity.activity.status.success'),
    },
    [ActivityType.Self]: {
      icon: 'Tick',
      color: 'positive',
      statusKey: t('activity.activity.status.success'),
    },
    [ActivityType.Failed]: {
      icon: 'AlertTriangle',
      color: 'negative',
      statusKey: t('activity.activity.status.failed'),
    },
  };
  return activityMap[type] ?? defaultStatus;
};

const formatFeeValue = (
  fee: string | undefined,
  networkType: NetworkType,
): string => {
  if (fee === undefined || fee === '') return '';
  const ticker = getDustTokenTickerByNetwork(networkType);
  return `${formatAmountToLocale(fee, DUST_TOKEN_DECIMALS)} ${ticker}`;
};

const MidnightActivityDetailsContent = ({
  activityDetail,
  activityId,
  tokensMetadataByTokenId,
}: ActivityDetailsContentProps) => {
  const { t } = useTranslation();
  const networkType = useLaceSelector('network.selectNetworkType');
  const recoveredFees = useLaceSelector('midnightContext.selectRecoveredFees');
  const isFeeRecoverySupported = useLaceSelector(
    'midnightContext.selectSupportsFeeRecovery',
  );
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const account = accounts.find(
    candidate => candidate.accountId === activityDetail?.accountId,
  );
  // SDK metadata takes precedence, including a genuine zero fee.
  const fee =
    activityDetail?.fee ||
    (activityDetail &&
      recoveredFees[activityDetail.accountId]?.[activityId.toLowerCase()]);

  const isFeeMissing = !!activityDetail && (fee === undefined || fee === '');
  const canFetchFee =
    isFeeMissing &&
    isFeeRecoverySupported &&
    account !== undefined &&
    [ActivityType.Send, ActivityType.Receive, ActivityType.Self].includes(
      activityDetail.type,
    );
  const openAccountOptions = () => {
    if (!account) return;
    NavigationControls.navigate(StackRoutes.AccountDetails, {
      walletId: account.walletId,
      accountId: account.accountId,
    });
  };

  const formattedAmount =
    formatTokenBalanceChangesUtil(
      activityDetail?.tokenBalanceChanges,
      tokensMetadataByTokenId,
      {
        defaultDecimals: DUST_TOKEN_DECIMALS,
        unknownTicker: t('activity.unnamed.ticker'),
        filterUnknown: false,
      },
    ) || '—';

  const renderActivityStatus = useCallback(
    (type: ActivityType) => {
      const { icon, color, statusKey } = getActivityStatus(type, t);
      return (
        <CustomTag
          testID="activity-details-status-value"
          size="M"
          color={color}
          backgroundType="colored"
          icon={<Icon name={icon} size={16} />}
          label={statusKey}
        />
      );
    },
    [t],
  );

  return (
    <View style={styles.container}>
      <ActivityDetailItem
        testID="activity-details-status-label"
        label={t('v2.activity-details.sheet.status')}
        value={
          activityDetail ? renderActivityStatus(activityDetail.type) : null
        }
      />
      <ActivityDetailItem
        label={t('v2.activity-details.sheet.transactionId')}
        value={
          <Text.M style={styles.valueText} numberOfLines={1}>
            {activityId}
          </Text.M>
        }
      />
      <ActivityDetailItem
        label={t('v2.activity-details.sheet.amount')}
        value={formattedAmount}
      />
      <ActivityDetailItem
        label={t('v2.activity-details.sheet.to')}
        value={
          <Text.M style={styles.valueText} numberOfLines={1}>
            {activityDetail?.address ?? ''}
          </Text.M>
        }
      />
      <ActivityDetailItem
        label={t('v2.activity-details.sheet.timestamp')}
        value={
          activityDetail ? (
            <Column alignItems="flex-end">
              <Text.M>
                {formatDate({
                  date: activityDetail.timestamp || '',
                  type: 'local',
                })}
              </Text.M>
              <Text.M variant="secondary">
                {formatTime({
                  date: activityDetail.timestamp || '',
                  type: 'local',
                })}
              </Text.M>
            </Column>
          ) : null
        }
      />
      <ActivityDetailItem
        label={t('activity.activity-detail-drawer.fee')}
        testID="activity-details-fee"
        value={
          isFeeMissing
            ? t('midnight.fee-recovery.unavailable')
            : formatFeeValue(fee, networkType)
        }
      />
      {canFetchFee && (
        <Text.S variant="secondary" testID="activity-details-missing-fee-help">
          <Trans
            i18nKey="midnight.fee-recovery.account-options-hint"
            components={{
              accountOptions: (
                <AccountOptionsLink onPress={openAccountOptions} />
              ),
            }}
          />
        </Text.S>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
  container: {
    paddingBottom: spacing.M,
    width: '100%',
    gap: spacing.M,
    flex: 1,
  },
  valueText: {
    textAlign: 'right',
    flex: 1,
  },
});

export const activityDetailsSheetUICustomisation = () =>
  createUICustomisation<ActivityDetailsSheetUICustomisation>({
    key: 'Midnight',
    uiCustomisationSelector: (params: { blockchainName: string }) =>
      params.blockchainName === 'Midnight',
    ActivityDetailsContent: MidnightActivityDetailsContent,
  });
