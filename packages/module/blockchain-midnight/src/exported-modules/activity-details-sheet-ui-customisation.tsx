import { ActivityType } from '@lace-contract/activities';
import { useTranslation } from '@lace-contract/i18n';
import {
  DUST_TOKEN_DECIMALS,
  getDustTokenTickerByNetwork,
} from '@lace-contract/midnight-context';
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
import { StyleSheet, View } from 'react-native';

import { ActivityDetailItem } from '../components/ActivityDetailItem';
import { useLaceSelector } from '../hooks';

import type {
  ActivityDetailsContentProps,
  ActivityDetailsSheetUICustomisation,
} from '@lace-contract/activities';
import type { TFunction } from '@lace-contract/i18n';
import type { NetworkType } from '@lace-contract/network';
import type { ColorType, IconName } from '@lace-lib/ui-toolkit';

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
        label={t('v2.activity-details.sheet.fee')}
        value={formatFeeValue(activityDetail?.fee, networkType)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
