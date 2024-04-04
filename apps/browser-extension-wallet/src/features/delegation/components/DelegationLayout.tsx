import React from 'react';
import isNumber from 'lodash/isNumber';
import { useTranslation } from 'react-i18next';
import { Skeleton, Typography } from 'antd';
import { Wallet } from '@lace/cardano';
import { StakePoolSearch, StakePoolSearchProps } from '@lace/staking';
import { StakeFundsBanner } from '@views/browser/features/staking/components/StakeFundsBanner';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { StakingInfo } from '@views/browser/features/staking/components/StakingInfo';
import { ContentLayout } from '@src/components/Layout';
import { ExpandViewBanner } from './ExpandViewBanner';
import styles from './DelegationLayout.module.scss';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { useWalletStore } from '@src/stores';

const { Text } = Typography;

export interface StakePool {
  id: string;
  theme?: string;
  name?: string;
  ticker?: string;
  logo?: string;
  margin: string;
  fee: string;
  pledgeMet?: boolean;
  retired?: boolean;
  onClick?: () => unknown;
}

export type DelegationLayoutProps = {
  searchValue: string;
  searchedPools: StakePoolSearchProps['pools'];
  currentStakePool?: StakePool;
  handleSearchChange: (val: string) => unknown;
  coinBalance: number;
  handleAddFunds: () => unknown;
  showAddFunds?: boolean;
  isLoading?: boolean;
  isSearching?: boolean;
  hasNoFunds?: boolean;
  isDelegating?: boolean;
  canDelegate?: boolean;
  walletAddress: Wallet.Cardano.PaymentAddress;
  fiat?: number;
  totalRewards: string;
  lastReward: string;
  onStakePoolSelect: () => void;
  onStakePoolClick?: (id: string) => void;
  cardanoCoin: Wallet.CoinId;
};

export const DelegationLayout = ({
  searchedPools,
  handleSearchChange,
  coinBalance,
  currentStakePool,
  fiat,
  isLoading,
  isSearching,
  hasNoFunds,
  isDelegating,
  canDelegate,
  walletAddress,
  totalRewards,
  lastReward,
  onStakePoolSelect,
  onStakePoolClick,
  cardanoCoin
}: DelegationLayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const totalResultCount = useWalletStore(({ stakePoolSearchResults }) => stakePoolSearchResults?.totalResultCount);
  const showExpandView = hasNoFunds || (!hasNoFunds && !isDelegating) || isDelegating;

  const stakePoolSearchTranslations = {
    gettingSaturated: t('cardano.stakePoolSearch.gettingSaturated'),
    saturated: t('cardano.stakePoolSearch.saturated'),
    overSaturation: t('cardano.stakePoolSearch.overSaturated'),
    staking: t('cardano.stakePoolSearch.staking'),
    searchPlaceholder: t('cardano.stakePoolSearch.searchPlaceholder')
  };

  return (
    <ContentLayout
      title={<SectionTitle title={t('staking.sectionTitle')} classname={styles.sectionTilte} />}
      isLoading={isLoading}
    >
      <div className={styles.content}>
        <Skeleton loading={!isNumber(coinBalance)}>
          <div className={styles.contentWrapper}>
            {canDelegate && <StakeFundsBanner balance={coinBalance} popupView />}

            {hasNoFunds && (
              <FundWalletBanner
                title={t('browserView.assets.welcome')}
                subtitle={t('browserView.staking.fundWalletBanner.subtitle')}
                prompt={t('browserView.staking.fundWalletBanner.prompt')}
                walletAddress={walletAddress?.toString()}
                shouldHaveVerticalContent
              />
            )}
            {isDelegating && (
              <StakingInfo
                {...{
                  ...currentStakePool,
                  coinBalance,
                  fiat,
                  totalRewards,
                  lastReward,
                  cardanoCoin
                }}
                onStakePoolSelect={onStakePoolSelect}
                popupView
              />
            )}
            <div>
              <div className={styles.title}>
                <h1 className={styles.subHeader}>{t('staking.stakePools.sectionTitle')}</h1>
                <Text data-testid="section-title-counter" className={styles.sideText}>
                  ({totalResultCount || 0})
                </Text>
              </div>

              <StakePoolSearch
                // eslint-disable-next-line unicorn/no-null
                value={null}
                pools={searchedPools}
                onChange={handleSearchChange}
                isSearching={isSearching}
                onStakePoolClick={onStakePoolClick}
                translations={stakePoolSearchTranslations}
                withSuggestions
              />
            </div>
            {showExpandView && <ExpandViewBanner />}
          </div>
        </Skeleton>
      </div>
    </ContentLayout>
  );
};
