import { InfoCircleOutlined } from '@ant-design/icons';
import { Wallet } from '@lace/cardano';
import { Banner } from '@lace/common';
import { Box, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { DelegationCard } from './DelegationCard';
import { FundWalletBanner } from './FundWalletBanner';
import { GetStartedSteps } from './GetStartedSteps';
import { hasPendingDelegationTransaction, mapPortfolioToDisplayData } from './helpers';
import * as styles from './Overview.css';
import { StakeFundsBanner } from './StakeFundsBanner';
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
    walletAddress,
    walletStoreWalletActivities: walletActivities,
    rewardAccounts,
    coinBalance,
  } = useOutsideHandles();
  const currentPortfolio = useDelegationPortfolioStore((store) => store.currentPortfolio);
  const setIsDrawerVisible = useStakePoolDetails((state) => state.setIsDrawerVisible);

  const stakeRegistered = rewardAccounts && rewardAccounts?.[0]?.keyStatus === Wallet.Cardano.StakeKeyStatus.Registered;
  const balanceTotal = balancesBalance?.total?.coinBalance && Number(balancesBalance.total.coinBalance);
  const noFunds = (balanceTotal < Number(coinBalance) && !stakeRegistered) || (coinBalance === 0 && stakeRegistered);

  const onStakePoolOpen = (stakePool: Wallet.Cardano.StakePool) => {
    setSelectedStakePool(stakePool);
    setIsDrawerVisible(true);
  };
  const pendingDelegationTransaction = hasPendingDelegationTransaction(walletActivities);

  if (noFunds)
    return (
      <FundWalletBanner
        title={t('overview.noFunds.title')}
        subtitle={t('overview.noFunds.description')}
        prompt={t('overview.noFunds.description')}
        walletAddress={walletAddress}
        shouldHaveVerticalContent
      />
    );
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
          <Flex flexDirection="column" gap="$32">
            <StakeFundsBanner balance={balancesBalance?.total?.coinBalance} />
            <GetStartedSteps />
          </Flex>
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
      <Box mb="$40">
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
        <Box mb="$40">
          <Banner
            withIcon
            customIcon={<InfoCircleOutlined className={styles.bannerInfoIcon} />}
            message={t('overview.banners.pendingPoolMigration.title')}
            description={t('overview.banners.pendingPoolMigration.message')}
          />
        </Box>
      )}
      <Flex justifyContent="space-between" mb="$16">
        <Text.SubHeading>{t('overview.yourPoolsSection.heading')}</Text.SubHeading>
      </Flex>
      {displayData.map((item) => (
        <Box key={item.id} mb="$24" data-testid="delegated-pool-item">
          <StakingInfoCard
            {...item}
            markerColor={displayData.length > 1 ? item.color : undefined}
            cardanoCoinSymbol="tADA"
            onStakePoolSelect={() => onStakePoolOpen(item.stakePool)}
          />
        </Box>
      ))}
    </>
  );
};
