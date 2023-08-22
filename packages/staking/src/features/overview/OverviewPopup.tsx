import { Wallet } from '@lace/cardano';
import { Box, Flex, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { StakePoolDetails } from '../drawer';
import { useOutsideHandles } from '../outside-handles-provider';
import { FundWalletBanner } from '../staking/FundWalletBanner';
import { StakeFundsBanner } from '../staking/StakeFundsBanner';
import { useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { DelegationCard } from './DelegationCard';
import { ExpandViewBanner } from './ExpandViewBanner';
import { mapPortfolioToDisplayData } from './mapPortfolioToDisplayData';
import { StakingInfoCard } from './staking-info-card';

export const OverviewPopup = () => {
  const { t } = useTranslation();
  const {
    walletStoreWalletUICardanoCoin,
    balancesBalance,
    compactNumber,
    stakingRewards,
    fetchCoinPricePriceResult,
    delegationStoreSetSelectedStakePool: setSelectedStakePool,
    walletAddress,
    noFunds,
  } = useOutsideHandles();
  const currentPortfolio = useDelegationPortfolioStore((store) => store.currentPortfolio);
  const setIsDrawerVisible = useStakePoolDetails((state) => state.setIsDrawerVisible);

  const onStakePoolOpen = (stakePool: Wallet.Cardano.StakePool) => {
    setSelectedStakePool(stakePool);
    setIsDrawerVisible(true);
  };

  if (noFunds)
    return (
      <Flex flexDirection="column" gap="$32">
        <FundWalletBanner
          title={t('overview.noFunds.title')}
          subtitle={t('overview.noFunds.description')}
          prompt={t('overview.noFunds.description')}
          walletAddress={walletAddress}
          shouldHaveVerticalContent
        />
        <ExpandViewBanner />
      </Flex>
    );
  if (currentPortfolio.length === 0)
    return (
      <Flex flexDirection="column" gap="$32">
        <StakeFundsBanner balance={balancesBalance?.total?.coinBalance} popupView />
        <ExpandViewBanner />
      </Flex>
    );

  const displayData = mapPortfolioToDisplayData({
    cardanoCoin: walletStoreWalletUICardanoCoin,
    cardanoPrice: fetchCoinPricePriceResult?.cardano?.price,
    portfolio: currentPortfolio,
    stakingRewards,
  });

  return (
    <>
      <Box mb={'$32'}>
        <DelegationCard
          balance={compactNumber(balancesBalance.available.coinBalance)}
          cardanoCoinSymbol={walletStoreWalletUICardanoCoin.symbol}
          arrangement={'vertical'}
          distribution={displayData.map(({ color, name = '-', weight }) => ({
            color,
            name,
            value: weight,
          }))}
          status={currentPortfolio.length === 1 ? 'simple-delegation' : 'multi-delegation'}
        />
      </Box>
      <Flex justifyContent={'space-between'} mb={'$16'}>
        <Text.SubHeading>{t('overview.yourPoolsSection.heading')}</Text.SubHeading>
      </Flex>
      <Box mb={'$32'}>
        {displayData.map((item) => (
          <Box key={item.id} mb={'$24'} data-testid="delegated-pool-item">
            <StakingInfoCard
              {...item}
              popupView
              markerColor={displayData.length > 1 ? item.color : undefined}
              cardanoCoinSymbol={'tADA'}
              onStakePoolSelect={() => onStakePoolOpen(item.stakePool)}
            />
          </Box>
        ))}
      </Box>
      <ExpandViewBanner />
      <StakePoolDetails
        showBackIcon
        showExitConfirmation={() => false}
        onStakeOnThisPool={() => void 0}
        onSelect={() => void 0}
        onUnselect={() => void 0}
        popupView
      />
    </>
  );
};
