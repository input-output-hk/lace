import React, { useEffect, useState, useCallback } from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { StateStatus, useWalletStore } from '@src/stores';
import { useFetchCoinPrice, useRedirection } from '@hooks';
import { useCurrencyStore } from '@providers/currency';
import { Drawer, DrawerNavigation } from '@lace/common';
import { GroupedAssetActivityList } from '@lace/core';
import { TransactionDetail } from '@src/views/browser-view/features/activity';
import styles from './Activity.module.scss';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { walletRoutePaths } from '@routes';
import { FetchWalletActivitiesReturn } from '@src/stores/slices';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';

export const Activity = (): React.ReactElement => {
  const { t } = useTranslation();
  const [walletActivitiesObservable, setWalletActivitiesObservable] = useState<FetchWalletActivitiesReturn>();
  const { priceResult } = useFetchCoinPrice();
  const {
    walletInfo,
    walletActivities,
    getWalletActivitiesObservable,
    transactionDetail,
    resetTransactionState,
    activitiesCount,
    walletActivitiesStatus
  } = useWalletStore();
  const cardanoFiatPrice = priceResult?.cardano?.price;
  const { fiatCurrency } = useCurrencyStore();
  const isLoading = walletActivitiesStatus !== StateStatus.LOADED;
  const layoutTitle = `${t('browserView.activity.title')}`;
  const layoutSideText = `(${activitiesCount})`;
  const [redirectToAssets] = useRedirection(walletRoutePaths.assets);
  const analytics = useAnalyticsContext();

  const sendAnalytics = useCallback(() => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.VIEW_TRANSACTIONS,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: AnalyticsEventNames.ViewTransactions.VIEW_TX_DETAILS_POPUP
    });
  }, [analytics]);

  const fetchWalletActivities = useCallback(async () => {
    const result =
      fiatCurrency &&
      (await getWalletActivitiesObservable({
        fiatCurrency,
        cardanoFiatPrice,
        sendAnalytics
      }));
    setWalletActivitiesObservable(result);
  }, [fiatCurrency, cardanoFiatPrice, getWalletActivitiesObservable, sendAnalytics]);

  useEffect(() => {
    fetchWalletActivities();
  }, [fetchWalletActivities]);

  const hasActivities = walletActivities?.length > 0;

  useEffect(() => {
    const subscription = walletActivitiesObservable?.subscribe();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [walletActivitiesObservable]);

  return (
    <ContentLayout title={layoutTitle} titleSideText={layoutSideText} isLoading={isLoading}>
      <Drawer
        visible={!!transactionDetail}
        onClose={resetTransactionState}
        navigation={
          <DrawerNavigation
            onArrowIconClick={resetTransactionState}
            onCloseIconClick={() => {
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
