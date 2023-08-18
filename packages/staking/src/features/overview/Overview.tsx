import { InfoCircleOutlined } from '@ant-design/icons';
import { Wallet } from '@lace/cardano';
import { Banner } from '@lace/common';
import { Box, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { DelegationCard } from './DelegationCard';
import { hasPendingDelegationTransaction, mapPortfolioToDisplayData } from './helpers';
import * as styles from './Overview.css';
import { StakingInfoCard } from './staking-info-card';

export const Overview = () => {
  const { t } = useTranslation();
  const {
    walletStoreWalletUICardanoCoin,
    balancesBalance,
    compactNumber,
    stakingRewards,
    fetchCoinPricePriceResult,
    delegationStoreSetSelectedStakePool: setSelectedStakePool,
    walletStoreWalletActivities: walletActivities,
  } = useOutsideHandles();
  const currentPortfolio = useDelegationPortfolioStore((store) => store.currentPortfolio);
  const setIsDrawerVisible = useStakePoolDetails((state) => state.setIsDrawerVisible);

  const onStakePoolOpen = (stakePool: Wallet.Cardano.StakePool) => {
    setSelectedStakePool(stakePool);
    setIsDrawerVisible(true);
  };
  const pendingDelegationTransaction = hasPendingDelegationTransaction(walletActivities);

  if (currentPortfolio.length === 0)
    return (
      <>
        {pendingDelegationTransaction ? (
          <Banner
            withIcon
            customIcon={<InfoCircleOutlined className={styles.bannerInfoIcon} />}
            message={t('overview.banners.pendingFirstDelegation.title')}
            description={t('overview.banners.pendingFirstDelegation.message')}
          />
        ) : (
          <Text.SubHeading>Start staking</Text.SubHeading>
        )}
      </>
    );

  const displayData = mapPortfolioToDisplayData({
    cardanoCoin: walletStoreWalletUICardanoCoin,
    cardanoPrice: fetchCoinPricePriceResult?.cardano?.price,
    portfolio: currentPortfolio,
    stakingRewards,
  });

  return (
    <>
      <Box mb={'$40'}>
        <DelegationCard
          balance={compactNumber(balancesBalance.available.coinBalance)}
          cardanoCoinSymbol={walletStoreWalletUICardanoCoin.symbol}
          distribution={displayData.map(({ color, name = '-', weight }) => ({
            color,
            name,
            value: weight,
          }))}
          status={currentPortfolio.length === 1 ? 'simple-delegation' : 'multi-delegation'}
        />
      </Box>
      {pendingDelegationTransaction && (
        <Box mb={'$40'}>
          <Banner
            withIcon
            customIcon={<InfoCircleOutlined className={styles.bannerInfoIcon} />}
            message={t('overview.banners.pendingPoolMigration.title')}
            description={t('overview.banners.pendingPoolMigration.message')}
          />
        </Box>
      )}
      <Flex justifyContent={'space-between'} mb={'$16'}>
        <Text.SubHeading>{t('overview.yourPoolsSection.heading')}</Text.SubHeading>
      </Flex>
      {displayData.map((item) => (
        <Box key={item.id} mb={'$24'} data-testid="delegated-pool-item">
          <StakingInfoCard
            {...item}
            markerColor={displayData.length > 1 ? item.color : undefined}
            cardanoCoinSymbol={'tADA'}
            onStakePoolSelect={() => onStakePoolOpen(item.stakePool)}
          />
        </Box>
      ))}
    </>
  );
};
