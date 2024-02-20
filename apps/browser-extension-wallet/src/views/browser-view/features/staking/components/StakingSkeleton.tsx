/* eslint-disable max-statements */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { PropsWithChildren, useEffect, useState } from 'react';
import isNumber from 'lodash/isNumber';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { NetworkInfo } from '@lace/cardano';
import styles from './Staking.modules.scss';
import { stakingInfoSelector } from '@stores/selectors/staking-selectors';
import { EducationalList, SectionLayout } from '@src/views/browser-view/components';
import { useWalletStore } from '@stores';
import { useFetchCoinPrice, useBalances } from '@src/hooks';
import LightBulb from '@src/assets/icons/light.svg';
import {
  SortAndFilter,
  StakePoolSortOptions,
  SortAndFilterTab,
  SortField,
  SortDirection,
  FilterValues,
  PoolsFilter
} from '@lace/staking';

// eslint-disable-next-line @typescript-eslint/ban-types
export const StakingSkeleton = ({ children }: PropsWithChildren<object>): React.ReactElement => {
  const { t } = useTranslation();
  const { networkInfo, fetchNetworkInfo } = useWalletStore(stakingInfoSelector);
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);

  const [activeTab, setActiveTab] = useState<SortAndFilterTab>(SortAndFilterTab.sort);
  const [sort, setSort] = useState<StakePoolSortOptions>({
    field: SortField.saturation,
    order: SortDirection.asc
  });
  const [filter, setFilter] = useState<FilterValues>({
    [PoolsFilter.Saturation]: ['', ''],
    [PoolsFilter.ProfitMargin]: ['', ''],
    [PoolsFilter.Performance]: ['', ''],
    [PoolsFilter.Ros]: ['lastepoch']
  });

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
    <>
      <SortAndFilter
        activeTab={activeTab}
        sort={sort}
        filter={filter}
        onTabChange={setActiveTab}
        onSortChange={setSort}
        onFilterChange={setFilter}
      />
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
