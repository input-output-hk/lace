import React, { useCallback } from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { StateStatus, useWalletStore } from '@src/stores';
import { useFetchCoinPrice, useRedirection } from '@hooks';
import { Drawer, DrawerNavigation } from '@lace/common';
import { GroupedAssetActivityList } from '@lace/core';
import { ActivityDetail } from '@src/views/browser-view/features/activity';
import styles from './Activity.module.scss';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { walletRoutePaths } from '@routes';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { useWalletActivities } from '@hooks/useWalletActivities';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';

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
  const { walletActivities, walletActivitiesStatus } = useWalletActivities({
    sendAnalytics,
    withLimitedRewardsHistory: true
  });

  const layoutSideText = `(${t('browserView.activity.titleSideText')})`;
  const isLoading = walletActivitiesStatus !== StateStatus.LOADED;
  const hasActivities = walletActivities?.length > 0;

  return (
    <ContentLayout title={layoutTitle} titleSideText={layoutSideText} isLoading={isLoading}>
      <Drawer
        visible={!!activityDetail}
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
        {hasActivities ? (
          <GroupedAssetActivityList
            lists={walletActivities}
            infiniteScrollProps={{
              scrollableTarget: 'contentLayout',
              endMessage: (
                <Flex justifyContent="center">
                  <Text.Label>{t('walletActivity.endMessage')}</Text.Label>
                </Flex>
              )
            }}
          />
        ) : (
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
