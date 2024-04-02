/* eslint-disable max-statements */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { PropsWithChildren, useEffect } from 'react';
import isNumber from 'lodash/isNumber';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { NetworkInfo } from '@lace/cardano';
import { stakingInfoSelector } from '@stores/selectors/staking-selectors';
import { EducationalList, SectionLayout } from '@src/views/browser-view/components';
import { useWalletStore } from '@stores';
import { useBalances, useFetchCoinPrice } from '@src/hooks';
import LightBulb from '@src/assets/icons/light.svg';
import { BrowsePoolsPreferencesCard } from '@lace/staking';
import { Flex } from '@lace/ui';

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
      subtitle: t('educationalBanners.subtitle.howManyPools'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=how-many-stake-pools-can-i-delegate-stake-to-using-the-multi-staking-or-multi-delegation-feature`
    },
    {
      title: titles.faq,
      subtitle: t('educationalBanners.subtitle.ledgerSupport'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=do-ledger-hardware-wallets-support-multi-staking`
    },
    {
      title: titles.faq,
      subtitle: t('educationalBanners.subtitle.stakeDistribution'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=does-stake-distribution-remain-the-same`
    }
  ];

  const sidePanel = (
    <Flex flexDirection="column" alignItems="stretch" gap="$32" mb="$112">
      <BrowsePoolsPreferencesCard />
      <Skeleton loading={!networkInfo}>
        <NetworkInfo {...networkInfo} translations={translations} />
      </Skeleton>
      <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutStaking')} />
    </Flex>
  );

  return (
    <SectionLayout sidePanelContent={sidePanel}>
      <Skeleton loading={!isNumber(coinBalance)}>{children}</Skeleton>
    </SectionLayout>
  );
};
