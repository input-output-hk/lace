import React, { ReactElement, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { Skeleton } from 'antd';
import isNil from 'lodash/isNil';
import { GroupedAssetActivityList } from '@lace/core';
import { useFetchCoinPrice } from '../../../../../hooks';
import { useWalletStore } from '../../../../../stores';
import { Drawer, DrawerNavigation, useObservable } from '@lace/common';
import { ActivityDetail } from './ActivityDetail';
import { useTranslation } from 'react-i18next';
import { FundWalletBanner, EducationalList, SectionLayout, Layout } from '@src/views/browser-view/components';
import { SectionTitle } from '@components/Layout/SectionTitle';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';
import { LACE_APP_ID } from '@src/utils/constants';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { useWalletActivitiesPaginated } from '@hooks/useWalletActivities';

const loadMoreDebounce = 300;

export const ActivityLayout = (): ReactElement => {
  const { t } = useTranslation();
  const { priceResult } = useFetchCoinPrice();
  const { inMemoryWallet, walletInfo, activityDetail, resetActivityState, blockchainProvider } = useWalletStore();
  const analytics = useAnalyticsContext();
  const sendAnalytics = useCallback(() => {
    analytics.sendEventToPostHog(PostHogAction.ActivityActivityActivityRowClick);
  }, [analytics]);

  const { walletActivities, mightHaveMore, loadedTxLength, loadMore } = useWalletActivitiesPaginated({ sendAnalytics });
  const total = useObservable(inMemoryWallet.balance.utxo.total$);

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

  // Reset current transaction details and close drawer if network (blockchainProvider) has changed
  useEffect(() => {
    resetActivityState();
  }, [resetActivityState, blockchainProvider]);

  const isLoadingFirstTime = isNil(total);

  const endMessage = useMemo(() => <Flex justifyContent="center">{t('walletActivity.endMessage')}</Flex>, [t]);

  const debouncedLoadMore = useMemo(() => debounce(loadMore, loadMoreDebounce), [loadMore]);

  return (
    <Layout>
      <SectionLayout
        sidePanelContent={<EducationalList items={educationalList} title={t('browserView.sidePanel.learnAbout')} />}
      >
        <SectionTitle
          title={t('browserView.activity.title')}
          sideText={`(${t('browserView.activity.titleSideText')})`}
        />
        <Drawer
          open={!!activityDetail}
          onClose={resetActivityState}
          navigation={
            <DrawerNavigation
              title={t('transactions.detail.title')}
              onCloseIconClick={() => {
                analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailXClick);
                resetActivityState();
              }}
            />
          }
        >
          {activityDetail && priceResult && <ActivityDetail price={priceResult} />}
        </Drawer>
        <Skeleton loading={isLoadingFirstTime || walletActivities === undefined}>
          {walletActivities?.length > 0 && (
            <GroupedAssetActivityList
              hasMore={mightHaveMore}
              loadMore={debouncedLoadMore}
              lists={walletActivities}
              scrollableTarget={LACE_APP_ID}
              endMessage={endMessage}
              dataLength={loadedTxLength}
            />
          )}
          {walletActivities?.length === 0 && (
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
