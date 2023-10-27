import { useObservable } from '@lace/common';
import { Box, ControlButton, Flex, Text } from '@lace/ui';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { DelegationCard } from '../delegation-card';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { FundWalletBanner } from './FundWalletBanner';
import { GetStartedSteps } from './GetStartedSteps';
import { hasMinimumFundsToDelegate, hasPendingDelegationTransaction, mapPortfolioToDisplayData } from './helpers';
import { StakeFundsBanner } from './StakeFundsBanner';
import { StakingInfoCard } from './StakingInfoCard';
import { StakingNotificationBanner, getCurrentStakingNotification } from './StakingNotificationBanner';

export const Overview = () => {
  const { t } = useTranslation();
  const {
    walletStoreWalletUICardanoCoin,
    balancesBalance,
    compactNumber,
    fetchCoinPricePriceResult,
    walletAddress,
    walletStoreWalletActivities: walletActivities,
    walletStoreInMemoryWallet: inMemoryWallet,
  } = useOutsideHandles();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);
  const { currentPortfolio, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
    portfolioMutators: store.mutators,
  }));
  const stakingNotification = getCurrentStakingNotification({ currentPortfolio, walletActivities });

  const totalCoinBalance = balancesBalance?.total?.coinBalance;

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
  const pendingDelegationTransaction = hasPendingDelegationTransaction(walletActivities);

  const onManageClick = () => {
    portfolioMutators.executeCommand({
      type: 'ManagePortfolio',
    });
  };

  const displayData = mapPortfolioToDisplayData({
    cardanoCoin: walletStoreWalletUICardanoCoin,
    cardanoPrice: fetchCoinPricePriceResult?.cardano?.price,
    portfolio: currentPortfolio,
  });

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
        {stakingNotification ? (
          <StakingNotificationBanner
            notification={stakingNotification}
            onPortfolioDriftedNotificationClick={onManageClick}
          />
        ) : (
          <Flex flexDirection="column" gap="$32">
            <StakeFundsBanner balance={totalCoinBalance} />
            <GetStartedSteps />
          </Flex>
        )}
      </>
    );

  return (
    <>
      <Box mb="$40">
        <DelegationCard
          balance={compactNumber(balancesBalance.available.coinBalance)}
          cardanoCoinSymbol={walletStoreWalletUICardanoCoin.symbol}
          distribution={displayData.map(({ color, name = '-', onChainPercentage, apy, saturation }) => ({
            apy: apy ? String(apy) : undefined,
            color,
            name,
            percentage: onChainPercentage,
            saturation: saturation ? String(saturation) : undefined,
          }))}
          status={currentPortfolio.length === 1 ? 'simple-delegation' : 'multi-delegation'}
        />
      </Box>
      {stakingNotification && (
        <Box mb="$40">
          <StakingNotificationBanner
            notification={stakingNotification}
            onPortfolioDriftedNotificationClick={onManageClick}
          />
        </Box>
      )}
      <Flex justifyContent="space-between" mb="$16">
        <Text.SubHeading>{t('overview.yourPoolsSection.heading')}</Text.SubHeading>
        <ControlButton.Small
          disabled={pendingDelegationTransaction}
          onClick={onManageClick}
          label={t('overview.yourPoolsSection.manageButtonLabel')}
        />
      </Flex>
      {displayData.map((item) => (
        <Box key={item.id} mb="$24" data-testid="delegated-pool-item">
          <StakingInfoCard
            {...item}
            markerColor={displayData.length > 1 ? item.color : undefined}
            cardanoCoinSymbol={walletStoreWalletUICardanoCoin.symbol}
            onStakePoolSelect={() => {
              portfolioMutators.executeCommand({
                data: item.stakePool,
                type: 'ShowDelegatedPoolDetails',
              });
            }}
          />
        </Box>
      ))}
    </>
  );
};
