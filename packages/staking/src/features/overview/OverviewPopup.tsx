import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import { Box, Flex, Text } from '@lace/ui';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { StakePoolDetails } from '../drawer';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { DelegationCard } from './DelegationCard';
import { ExpandViewBanner } from './ExpandViewBanner';
import { FundWalletBanner } from './FundWalletBanner';
import { hasMinimumFundsToDelegate, mapPortfolioToDisplayData } from './helpers';
import { StakeFundsBanner } from './StakeFundsBanner';
import { StakingInfoCard } from './staking-info-card';

export const OverviewPopup = () => {
  const { t } = useTranslation();
  const {
    walletStoreWalletUICardanoCoin,
    balancesBalance,
    compactNumber,
    fetchCoinPricePriceResult,
    walletAddress,
    walletStoreInMemoryWallet: inMemoryWallet,
  } = useOutsideHandles();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);
  const { currentPortfolio, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
    portfolioMutators: store.mutators,
  }));

  const totalCoinBalance = balancesBalance?.total?.coinBalance || '0';

  if (
    !totalCoinBalance ||
    !protocolParameters?.stakeKeyDeposit ||
    !balancesBalance?.available?.coinBalance ||
    !rewardAccounts
  ) {
    return <Skeleton loading />;
  }

  const noFunds = !hasMinimumFundsToDelegate({
    rewardAccounts,
    stakeKeyDeposit: protocolParameters.stakeKeyDeposit,
    totalCoinBalance,
  });

  const onStakePoolOpen = (stakePool: Wallet.Cardano.StakePool) => {
    portfolioMutators.executeCommand({ data: stakePool, type: 'ShowDelegatedPoolDetails' });
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
        <StakeFundsBanner balance={totalCoinBalance} popupView />
        <ExpandViewBanner />
      </Flex>
    );

  const displayData = mapPortfolioToDisplayData({
    cardanoCoin: walletStoreWalletUICardanoCoin,
    cardanoPrice: fetchCoinPricePriceResult?.cardano?.price,
    portfolio: currentPortfolio,
  });

  return (
    <>
      <Box mb="$32">
        <DelegationCard
          balance={compactNumber(balancesBalance.available.coinBalance)}
          cardanoCoinSymbol={walletStoreWalletUICardanoCoin.symbol}
          arrangement="vertical"
          distribution={displayData}
          status={currentPortfolio.length === 1 ? 'simple-delegation' : 'multi-delegation'}
        />
      </Box>
      <Flex justifyContent="space-between" mb="$16">
        <Text.SubHeading>{t('overview.yourPoolsSection.heading')}</Text.SubHeading>
      </Flex>
      <Box mb="$32">
        {displayData.map((item) => (
          <Box key={item.id} mb="$24" data-testid="delegated-pool-item">
            <StakingInfoCard
              {...item}
              popupView
              markerColor={displayData.length > 1 ? item.color : undefined}
              cardanoCoinSymbol="tADA"
              onStakePoolSelect={() => onStakePoolOpen(item.stakePool)}
            />
          </Box>
        ))}
      </Box>
      <ExpandViewBanner />
      <StakePoolDetails showBackIcon showExitConfirmation={() => false} popupView />
    </>
  );
};
