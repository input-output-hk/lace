import { ACTIVITIES_PER_PAGE } from '@lace-contract/activities';
import { useConfig, useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  ActivityList,
  formatAndGroupActivitiesByDate,
} from '@lace-lib/ui-toolkit';
import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../../hooks';
import { PortfolioEmptyState } from '../empty-state';

import type { Activity } from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { ActivityCardType } from '@lace-lib/ui-toolkit';

const keyExtractor = (item: ActivityCardType) =>
  item.type === 'activity' ? item.props.rowKey : item.props.date;

type ActivityListProps = {
  accountId: AccountId;
  scrollEnabled: boolean;
  isVisible: boolean;
  activities: Activity<unknown>[];
};

export const ActivitiesList = ({
  accountId,
  isVisible,
  activities,
  scrollEnabled,
}: ActivityListProps) => {
  const { t } = useTranslation();

  // Load UI customizations for the account blockchain
  const [address] = useLaceSelector('addresses.selectByAccountId', accountId);
  const [activitiesItemUICustomisation] = useUICustomisation(
    'addons.loadActivitiesItemUICustomisations',
    { blockchainName: address?.blockchainName },
  );

  const { appConfig } = useConfig();

  const tokensMetadataByTokenId = useLaceSelector(
    'tokens.selectTokensMetadata',
  );
  const isLoadingOlderActivities = useLaceSelector(
    'activities.selectIsLoadingOlderActivitiesByAccount',
    accountId,
  );

  const hasLoadedOldestEntry = useLaceSelector(
    'activities.selectHasLoadedOldestEntryByAccount',
    accountId,
  );

  const incrementDesiredLoadedActivitiesCount = useDispatchLaceAction(
    'activities.incrementDesiredLoadedActivitiesCount',
  );

  const pollNewerAccountsActivities = useDispatchLaceAction(
    'activities.pollNewerAccountsActivities',
  );

  const handleActivityPress = useCallback(
    (id: string) => {
      if (activitiesItemUICustomisation?.onActivityClick) {
        activitiesItemUICustomisation.onActivityClick({
          activityId: id,
          address,
          config: appConfig,
        });
        return;
      }

      NavigationControls.sheets.navigate(SheetRoutes.ActivityDetail, {
        activityId: id,
      });
    },
    [activitiesItemUICustomisation, appConfig, address],
  );

  const incrementDesiredLoadedActivitiesCountDebounced = useMemo(
    () => debounce(incrementDesiredLoadedActivitiesCount, 300),
    [incrementDesiredLoadedActivitiesCount],
  );

  const loadOlderActivities = useCallback(() => {
    if (isLoadingOlderActivities || hasLoadedOldestEntry) return;

    return incrementDesiredLoadedActivitiesCountDebounced({
      accountId,
      incrementBy: ACTIVITIES_PER_PAGE,
    });
  }, [accountId, isLoadingOlderActivities, hasLoadedOldestEntry]);

  const onListEndReached = useCallback(() => {
    if (!isVisible) return;
    if (
      // Do not try to load more if we are still loading
      !isLoadingOlderActivities
    ) {
      loadOlderActivities();
    }
  }, [isVisible, isLoadingOlderActivities, loadOlderActivities]);

  const groupedActivities = useMemo(
    () =>
      formatAndGroupActivitiesByDate({
        activities,
        t,
        tokensMetadataByTokenId,
        getMainTokenBalanceChange:
          activitiesItemUICustomisation?.getMainTokenBalanceChange,
        getTokensInfoSummary:
          activitiesItemUICustomisation?.getTokensInfoSummary,
      }),
    [activities, tokensMetadataByTokenId, activitiesItemUICustomisation, t],
  );

  useEffect(() => {
    if (!isVisible) return;
    if (activities.length === 0) {
      loadOlderActivities();
    } else {
      // This is emitted multiple times, but the side effect
      // only handles the first occurrence
      pollNewerAccountsActivities();
    }
  }, [
    activities.length,
    isVisible,
    loadOlderActivities,
    pollNewerAccountsActivities,
  ]);

  if (activities.length === 0) {
    return (
      <PortfolioEmptyState
        iconName="Clock"
        message={t('v2.emptystate.activity.copy')}
      />
    );
  }

  return (
    <ActivityList
      sections={groupedActivities}
      onEndReachedThreshold={0.2}
      keyExtractor={keyExtractor}
      onEndReached={onListEndReached}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={scrollEnabled}
      onActivityPress={handleActivityPress}
      isLoadingOlderActivities={isLoadingOlderActivities}
    />
  );
};
