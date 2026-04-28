import {
  ActivityType,
  type Activity,
  type GetActivityTokenBalanceChange,
  type GetActivityTokensInfoSummary,
} from '@lace-contract/activities';
import {
  formatAmountRawToDenominated,
  formatDate,
  formatTime,
} from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';
import groupBy from 'lodash/groupBy';

import type { IconName } from '../design-system/atoms/icons/Icon';
import type { ActivityCardProps } from '../design-system/molecules/activityCard/activityCard';
import type {
  ActivitySection,
  FormattedActivityListItem,
} from '../design-system/organisms/activityList/activityList';
import type { TFunction } from '@lace-contract/i18n';
import type { MetadataByTokenId, TokenId } from '@lace-contract/tokens';

const ActivityToFormattedType = {
  [ActivityType.Send]: 'sent',
  [ActivityType.Receive]: 'received',
  [ActivityType.Rewards]: 'rewards',
  [ActivityType.Self]: 'received',
  [ActivityType.Failed]: 'failed',
  [ActivityType.Pending]: 'pending',
  [ActivityType.Delegation]: 'delegation',
  [ActivityType.Registration]: 'registration',
  [ActivityType.Deregistration]: 'deregistration',
  [ActivityType.Withdrawal]: 'withdrawal',
};

const activityToIconName: Record<ActivityType, IconName> = {
  Send: 'ArrowUp03',
  Delegation: 'ArrowUp03',
  Registration: 'ArrowUp03',
  Deregistration: 'ArrowDown03',
  Withdrawal: 'ArrowDown03',
  Receive: 'ArrowDown03',
  Rewards: 'Gift',
  Self: 'Recycle03',
  Failed: 'AlertTriangle',
  Pending: 'Loading03',
};

const mapActivityTypeToLabel = (type: ActivityType, t: TFunction) => {
  switch (type) {
    case ActivityType.Send:
      return t('activity.history.send');
    case ActivityType.Receive:
      return t('activity.history.receive');
    case ActivityType.Rewards:
      return t('activity.history.reward');
    case ActivityType.Self:
      return t('activity.history.self');
    case ActivityType.Failed:
      return t('activity.history.failed.title');
    case ActivityType.Pending:
      return t('activity.history.pending.title');
    case ActivityType.Delegation:
      return t('activity.history.delegation');
    case ActivityType.Registration:
      return t('activity.history.registration');
    case ActivityType.Deregistration:
      return t('activity.history.deregistration');
    case ActivityType.Withdrawal:
      return t('activity.history.withdrawal');
  }
};

const mapPendingOrFailedTypeToValueSubtitle = (
  type: ActivityType.Failed | ActivityType.Pending,
  t: TFunction,
  mainTokenAmount?: BigNumber,
) => {
  switch (type) {
    case ActivityType.Failed:
      return t('activity.history.failed.subtitle');
    case ActivityType.Pending: {
      const isReceiving =
        mainTokenAmount && BigNumber.valueOf(mainTokenAmount) > 0n;
      return isReceiving
        ? t('activity.history.pending.receiving')
        : t('activity.history.pending.sending');
    }
  }
};

export type FormatAndGroupActivitiesByDateParams = {
  activities: Activity[];
  t: TFunction;
  tokensMetadataByTokenId: MetadataByTokenId;
  getMainTokenBalanceChange?: GetActivityTokenBalanceChange;
  getTokensInfoSummary?: GetActivityTokensInfoSummary;
  /** When true, skip the internal sort — caller guarantees descending timestamp order. */
  preSorted?: boolean;
};

/** Stable React list key: one tx can surface as multiple activity rows (different `type`). */
export const activityListRowKey = (
  activity: Pick<Activity, 'activityId' | 'type'>,
) => `${activity.activityId}-${activity.type}`;

export const formatAndGroupActivitiesByDate = ({
  activities,
  t,
  tokensMetadataByTokenId,
  preSorted,
  getMainTokenBalanceChange,
  getTokensInfoSummary,
}: FormatAndGroupActivitiesByDateParams): ActivitySection[] => {
  const getActivityCard = (activity: Activity): FormattedActivityListItem => {
    const rowKey = activityListRowKey(activity);
    const { activityId, type, timestamp, tokenBalanceChanges } = activity;

    const enrichedTokenBalanceChanges = tokenBalanceChanges.map(
      ({ tokenId, amount }) => ({
        tokenId,
        token: tokensMetadataByTokenId[tokenId],
        amount,
      }),
    );

    const mainTokenChange =
      getMainTokenBalanceChange?.(enrichedTokenBalanceChanges) ??
      enrichedTokenBalanceChanges[0];

    const amount =
      mainTokenChange &&
      formatAmountRawToDenominated(
        mainTokenChange?.amount ?? 0,
        mainTokenChange?.token?.decimals ?? 0,
        mainTokenChange.token?.displayDecimalPlaces,
      );

    const tokensInfoSummary = getTokensInfoSummary?.(
      enrichedTokenBalanceChanges,
      {
        nfts: t('activity.assets.nfts'),
        tokens: t('activity.assets.tokens'),
        mixed: t('activity.assets.mixed'),
        unknownToken: t('activity.unknown.ticker'),
      },
    ) ?? {
      title: {
        amount: amount ?? '',
        label: mainTokenChange?.token?.ticker ?? t('activity.unknown.ticker'),
      },
    };

    const formattedTimeOfDay = formatTime({
      date: timestamp,
      type: 'local',
    });

    const title = [ActivityType.Receive, ActivityType.Send].includes(type)
      ? activityId
      : mapActivityTypeToLabel(type, t);

    const status = ActivityToFormattedType[type];
    const iconName = activityToIconName[type];

    const commonProps = {
      id: activityId,
      timestamp,
      status,
    };

    const buildActivityCardProps = (): ActivityCardProps => {
      switch (type) {
        case ActivityType.Self:
        case ActivityType.Send:
        case ActivityType.Receive:
        case ActivityType.Delegation:
        case ActivityType.Registration:
        case ActivityType.Deregistration:
        case ActivityType.Withdrawal:
          return {
            ...commonProps,
            info: {
              title,
              subtitle: formattedTimeOfDay,
            },
            value: tokensInfoSummary,
            iconName,
            iconBackground:
              type === ActivityType.Send || type === ActivityType.Receive
                ? 'positive'
                : 'secondary',
          } as ActivityCardProps;
        case ActivityType.Failed:
        case ActivityType.Pending:
          return {
            ...commonProps,
            info: {
              title: mapActivityTypeToLabel(type, t),
            },
            value: {
              subtitle: mapPendingOrFailedTypeToValueSubtitle(
                type,
                t,
                mainTokenChange?.amount,
              ),
            },
            iconName,
            iconBackground:
              type === ActivityType.Failed ? 'negative' : 'neutral',
          } as ActivityCardProps;
        case ActivityType.Rewards:
          return {
            ...commonProps,
            info: {
              title,
              subtitle: formattedTimeOfDay,
            },
            value: tokensInfoSummary,
            iconName,
            iconBackground: 'positive',
          } as ActivityCardProps;
      }
    };

    return { ...buildActivityCardProps(), rowKey };
  };

  const sortedActivities = preSorted
    ? activities
    : activities.slice().sort((firstTx, secondTx) => {
        return Number(secondTx.timestamp) - Number(firstTx.timestamp);
      });

  const activitiesByDate = groupBy(sortedActivities, activity =>
    formatDate({
      date: activity.timestamp,
      type: 'local',
    }),
  );

  const formatedTodaysDate = formatDate({
    date: Date.now(),
    type: 'local',
  });

  return Object.entries(activitiesByDate).map(([date, groupActivities]) => ({
    date: date === formatedTodaysDate ? t('activity.label.today') : date,
    items: groupActivities.map(getActivityCard),
    dateIcon: 'Calendar03' as IconName,
  }));
};

export type FormatTokenBalanceChangesOptions = {
  defaultDecimals?: number;
  unknownTicker: string;
  /** When true, exclude tokens without metadata (activities-extension style). When false, show all tokens with fallbacks (blockchain-midnight style). */
  filterUnknown?: boolean;
};

export const formatTokenBalanceChanges = (
  tokenBalanceChanges:
    | Array<{ tokenId: TokenId; amount: BigNumber }>
    | undefined,
  tokensMetadataByTokenId: MetadataByTokenId,
  options: FormatTokenBalanceChangesOptions,
): string => {
  if (!tokenBalanceChanges?.length) return '';
  const items = options.filterUnknown
    ? tokenBalanceChanges.filter(
        ({ tokenId }) => !!tokensMetadataByTokenId[tokenId],
      )
    : tokenBalanceChanges;
  if (!items.length) return '';
  return items
    .map(({ tokenId, amount }) => {
      const metadata = tokensMetadataByTokenId[tokenId];
      const decimals = metadata?.decimals ?? options.defaultDecimals ?? 0;
      const ticker = metadata?.ticker ?? options.unknownTicker;
      return `${formatAmountRawToDenominated(
        amount.toString(),
        decimals,
      )} ${ticker}`;
    })
    .join(', ');
};
