import React, { useCallback } from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { StateStatus, useWalletStore } from '@src/stores';
import { useFetchCoinPrice, useRedirection } from '@hooks';
import { Drawer, DrawerNavigation } from '@lace/common';
import { GroupedAssetActivityList } from '@lace/core';
import { TransactionDetail } from '@src/views/browser-view/features/activity';
import styles from './Activity.module.scss';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { walletRoutePaths } from '@routes';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { useWalletActivities } from '@hooks/useWalletActivities';

export const Activity = (): React.ReactElement => {
  const { t } = useTranslation();
  const { priceResult } = useFetchCoinPrice();
  const { walletInfo, transactionDetail, resetTransactionState } = useWalletStore();
  const layoutTitle = `${t('browserView.activity.title')}`;
  const redirectToAssets = useRedirection(walletRoutePaths.assets);
  const analytics = useAnalyticsContext();

  const sendAnalytics = useCallback(() => {
    analytics.sendEventToMatomo({
      category: MatomoEventCategories.VIEW_TRANSACTIONS,
      action: MatomoEventActions.CLICK_EVENT,
      name: AnalyticsEventNames.ViewTransactions.VIEW_TX_DETAILS_POPUP
    });
    analytics.sendEventToPostHog(PostHogAction.ActivityActivityActivityRowClick);
  }, [analytics]);
  const { walletActivities, walletActivitiesStatus, activitiesCount } = useWalletActivities({ sendAnalytics });

  const layoutSideText = `(${activitiesCount})`;
  const isLoading = walletActivitiesStatus !== StateStatus.LOADED;
  const hasActivities = walletActivities?.length > 0;

  return (
    <ContentLayout title={layoutTitle} titleSideText={layoutSideText} isLoading={isLoading}>
      <Drawer
        open={!!transactionDetail}
        onClose={resetTransactionState}
        navigation={
          <DrawerNavigation
            onArrowIconClick={resetTransactionState}
            onCloseIconClick={() => {
              analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailXClick);
              resetTransactionState();
              redirectToAssets();
            }}
          />
        }
        popupView
      >
        {transactionDetail && priceResult && <TransactionDetail price={priceResult} />}
      </Drawer>
      <div className={styles.activitiesContainer}>
        {hasActivities ? (
          <GroupedAssetActivityList
            lists={walletActivities}
            infiniteScrollProps={{ scrollableTarget: 'contentLayout' }}
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
