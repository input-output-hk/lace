import React, { useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@src/stores';
import { useFetchCoinPrice, useRedirection } from '@hooks';
import { Drawer, DrawerNavigation } from '@lace/common';
import { GroupedAssetActivityList } from '@lace/core';
import { ActivityDetail } from '@src/views/browser-view/features/activity';
import styles from './Activity.module.scss';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { walletRoutePaths } from '@routes';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { useWalletActivitiesPaginated } from '@hooks/useWalletActivities';

const loadMoreDebounce = 300;

export const Activity = (): React.ReactElement => {
  const { t } = useTranslation();
  const { priceResult } = useFetchCoinPrice();
  const { walletInfo, activityDetail, resetActivityState } = useWalletStore();
  const layoutTitle = `${t('browserView.activity.title')}`;
  const redirectToAssets = useRedirection(walletRoutePaths.assets);
  const analytics = useAnalyticsContext();

  const sendAnalytics = useCallback(() => {
    analytics.sendEventToPostHog(PostHogAction.ActivityActivityActivityRowClick);
  }, [analytics]);

  const { walletActivities, mightHaveMore, loadedTxLength, loadMore, retry, error } = useWalletActivitiesPaginated({
    sendAnalytics
  });

  const debouncedLoadMore = useMemo(() => debounce(loadMore, loadMoreDebounce), [loadMore]);

  return (
    <ContentLayout title={layoutTitle} isLoading={walletActivities === undefined}>
      <Drawer
        open={!!activityDetail}
        onClose={resetActivityState}
        navigation={
          <DrawerNavigation
            onArrowIconClick={resetActivityState}
            onCloseIconClick={() => {
              analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailXClick);
              resetActivityState();
              redirectToAssets();
            }}
          />
        }
        popupView
      >
        {activityDetail && priceResult && <ActivityDetail price={priceResult} />}
      </Drawer>
      <div className={styles.activitiesContainer}>
        {walletActivities?.length > 0 && (
          <GroupedAssetActivityList
            hasMore={mightHaveMore}
            loadMore={debouncedLoadMore}
            lists={walletActivities}
            scrollableTarget="contentLayout"
            dataLength={loadedTxLength}
            loadingError={error}
            retryLoading={retry}
          />
        )}
        {walletActivities?.length === 0 && (
          <div className={styles.emptyState}>
            <FundWalletBanner
              title={t('browserView.assets.welcome')}
              subtitle={t('browserView.activity.fundWalletBanner.title')}
              prompt={t('browserView.fundWalletBanner.prompt')}
              walletAddress={walletInfo.addresses[0].address.toString()}
            />
          </div>
        )}
      </div>
    </ContentLayout>
  );
};
