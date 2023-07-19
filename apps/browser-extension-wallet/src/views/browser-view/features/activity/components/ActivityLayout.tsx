import React, { ReactElement, useEffect, useState, useCallback } from 'react';
import { Skeleton } from 'antd';
import isNil from 'lodash/isNil';
import { GroupedAssetActivityList } from '@lace/core';
import { useFetchCoinPrice } from '../../../../../hooks';
import { StateStatus, useWalletStore } from '../../../../../stores';
import { Drawer, DrawerNavigation, useObservable } from '@lace/common';
import { TransactionDetail } from './TransactionDetail';
import { useCurrencyStore } from '../../../../../providers/currency';
import { useTranslation } from 'react-i18next';
import { FundWalletBanner, EducationalList, SectionLayout, Layout } from '@src/views/browser-view/components';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { FetchWalletActivitiesReturn } from '@src/stores/slices';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';
import { LACE_APP_ID } from '@src/utils/constants';
import { useAnalyticsContext } from '@providers';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';

export const ActivityLayout = (): ReactElement => {
  const { t } = useTranslation();
  const [walletActivitiesObservable, setWalletActivitiesObservable] = useState<FetchWalletActivitiesReturn>();
  const { priceResult } = useFetchCoinPrice();
  const {
    inMemoryWallet,
    walletInfo,
    walletActivities,
    getWalletActivitiesObservable,
    transactionDetail,
    resetTransactionState,
    activitiesCount,
    walletActivitiesStatus,
    blockchainProvider
  } = useWalletStore();
  const cardanoFiatPrice = priceResult?.cardano?.price;
  const { fiatCurrency } = useCurrencyStore();
  const total = useObservable(inMemoryWallet.balance.utxo.total$);
  const analytics = useAnalyticsContext();

  const titles = {
    glossary: t('educationalBanners.title.glossary'),
    faq: t('educationalBanners.title.faq'),
    video: t('educationalBanners.title.video')
  };

  const educationalList = [
    {
      title: titles.glossary,
      subtitle: t('browserView.activity.learnAbout.whatAreActivityDetails'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=activity`
    },
    {
      title: titles.glossary,
      subtitle: t('browserView.activity.learnAbout.whatIsAnUnconfirmedTransaction'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=unconfirmed-transaction`
    },
    {
      title: titles.faq,
      subtitle: t('browserView.activity.learnAbout.doesLaceHaveFees'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=does-lace-have-fees`
    },
    {
      title: titles.video,
      subtitle: t('browserView.activity.learnAbout.transactionBundles'),
      src: Video,
      link: `${process.env.WEBSITE_URL}/learn?video=lace-introduces-transaction-bundles`
    }
  ];

  const sendAnalytics = useCallback(() => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.VIEW_TRANSACTIONS,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: AnalyticsEventNames.ViewTransactions.VIEW_TX_DETAILS_BROWSER
    });
  }, [analytics]);

  const fetchWalletActivities = useCallback(async () => {
    const result =
      fiatCurrency &&
      cardanoFiatPrice &&
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

  // Reset current transaction details and close drawer if network (blockchainProvider) has changed
  useEffect(() => {
    resetTransactionState();
  }, [resetTransactionState, blockchainProvider]);

  useEffect(() => {
    if (!walletActivitiesObservable) return;
    const subscription = walletActivitiesObservable?.subscribe();
    // eslint-disable-next-line consistent-return
    return () => subscription.unsubscribe();
  }, [walletActivitiesObservable]);
  const isLoadingFirstTime = isNil(total);

  return (
    <Layout>
      <SectionLayout
        sidePanelContent={<EducationalList items={educationalList} title={t('browserView.sidePanel.learnAbout')} />}
      >
        <SectionTitle
          title={t('browserView.activity.title')}
          sideText={activitiesCount ? `(${activitiesCount})` : ''}
        />
        <Drawer
          visible={!!transactionDetail}
          onClose={resetTransactionState}
          navigation={
            <DrawerNavigation title={t('transactions.detail.title')} onCloseIconClick={resetTransactionState} />
          }
        >
          {transactionDetail && priceResult && <TransactionDetail price={priceResult} />}
        </Drawer>
        <Skeleton loading={isLoadingFirstTime || walletActivitiesStatus !== StateStatus.LOADED}>
          {walletActivities?.length > 0 ? (
            <GroupedAssetActivityList
              lists={walletActivities}
              infiniteScrollProps={{ scrollableTarget: LACE_APP_ID }}
            />
          ) : (
            <FundWalletBanner
              title={t('browserView.activity.fundWalletBanner.title')}
              subtitle={t('browserView.activity.fundWalletBanner.subtitle')}
              prompt={t('browserView.fundWalletBanner.prompt')}
              walletAddress={walletInfo.addresses[0].address.toString()}
              shouldHaveVerticalContent
            />
          )}
        </Skeleton>
      </SectionLayout>
    </Layout>
  );
};
