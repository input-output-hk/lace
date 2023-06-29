/* eslint-disable max-statements */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { PropsWithChildren, useEffect } from 'react';
import isNumber from 'lodash/isNumber';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { NetworkInfo } from '@lace/cardano';
import styles from './Staking.modules.scss';
import { stakingInfoSelector } from '@stores/selectors/staking-selectors';
import { EducationalList, SectionLayout } from '@src/views/browser-view/components';
import { useWalletStore } from '@stores';
import { useFetchCoinPrice, useBalances } from '@src/hooks';
import Book from '@assets/icons/book.svg';
import LightBulb from '@src/assets/icons/light.svg';
import Video from '@assets/icons/video.svg';

// eslint-disable-next-line @typescript-eslint/ban-types
export const StakingSkeleton = ({ children }: PropsWithChildren<object>): React.ReactElement => {
  const { t } = useTranslation();
  const { networkInfo, fetchNetworkInfo } = useWalletStore(stakingInfoSelector);
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  const coinBalance = balance?.total?.coinBalance && Number(balance?.total?.coinBalance);

  const translations = {
    title: t('cardano.networkInfo.title'),
    currentEpoch: t('cardano.networkInfo.currentEpoch'),
    epochEnd: t('cardano.networkInfo.epochEnd'),
    totalPools: t('cardano.networkInfo.totalPools'),
    percentageStaked: t('cardano.networkInfo.percentageStaked'),
    averageApy: t('cardano.networkInfo.averageRos'),
    averageMargin: t('cardano.networkInfo.averageMargin')
  };

  const titles = {
    glossary: t('educationalBanners.title.glossary'),
    faq: t('educationalBanners.title.faq'),
    video: t('educationalBanners.title.video')
  };

  const educationalItems = [
    {
      title: titles.faq,
      subtitle: t('educationalBanners.subtitle.stakingAndDelegation'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=what-are-staking-and-delegation`
    },
    {
      title: titles.faq,
      subtitle: t('educationalBanners.subtitle.choosingAStakePool'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=which-stake-pool-should-i-choose`
    },
    {
      title: titles.glossary,
      subtitle: t('educationalBanners.subtitle.activeStake'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=active-stake`
    },
    {
      title: titles.video,
      subtitle: t('educationalBanners.subtitle.stakingMadeEasy'),
      src: Video,
      link: `${process.env.WEBSITE_URL}/learn?video=staking-with-lace-let-your-digital-assets-work-for-you`
    }
  ];

  const sidePanel = (
    <>
      <Skeleton loading={!networkInfo}>
        <NetworkInfo {...networkInfo} translations={translations} />
      </Skeleton>
      <div className={styles.educationalList}>
        <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutStaking')} />
      </div>
    </>
  );

  return (
    <SectionLayout sidePanelContent={sidePanel}>
      <Skeleton loading={!isNumber(coinBalance)}>{children}</Skeleton>
    </SectionLayout>
  );
};
