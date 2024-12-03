/* eslint-disable complexity */
import { Box, ControlButton, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useObservable } from '@lace/common';
import { Skeleton } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DelegationCard } from '../DelegationCard';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { FundWalletBanner } from './FundWalletBanner';
import { GetStartedSteps } from './GetStartedSteps';
import { hasMinimumFundsToDelegate, hasPendingDelegationTransaction, mapPortfolioToDisplayData } from './helpers';
import { useStakingSectionLoadActions } from './hooks';
import { RegisterAsDRepBanner } from './RegisterAsDRepBanner';
import { StakeFundsBanner } from './StakeFundsBanner';
import { StakingInfoCard } from './StakingInfoCard';
import { StakingNotificationBanners, getCurrentStakingNotifications } from './StakingNotificationBanners';

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
    isSharedWallet,
    govToolUrl,
    openExternalLink,
    useRewardAccountsData,
  } = useOutsideHandles();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);
  const { currentPortfolio, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
    portfolioMutators: store.mutators,
  }));
  const { onLoad } = useStakingSectionLoadActions();
  const stakingNotifications = getCurrentStakingNotifications({ currentPortfolio, walletActivities });

  const totalCoinBalance = balancesBalance?.total?.coinBalance;

  useEffect(() => {
    if (
      totalCoinBalance &&
      protocolParameters?.stakeKeyDeposit &&
      balancesBalance?.available?.coinBalance &&
      rewardAccounts
    ) {
      onLoad();
    }
  }, [
    balancesBalance?.available?.coinBalance,
    onLoad,
    protocolParameters?.stakeKeyDeposit,
    rewardAccounts,
    totalCoinBalance,
  ]);

  const { areAllRegisteredStakeKeysWithoutVotingDelegation: showRegisterAsDRepBanner, poolIdToRewardAccountsMap } =
    useRewardAccountsData();

  if (
    !totalCoinBalance ||
    !protocolParameters?.hasOwnProperty('stakeKeyDeposit') ||
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
    poolIdToRewardAccountsMap,
    portfolio: currentPortfolio,
  });

  if (noFunds) {
    return (
      <FundWalletBanner
        title={t('overview.noFunds.title')}
        subtitle={t('overview.noFunds.description')}
        prompt={t('overview.noFunds.description')}
        walletAddress={walletAddress}
        shouldHaveVerticalContent
      />
    );
  }

  if (currentPortfolio.length === 0) {
    return (
      <>
        {/* defensive check - no other notification than pendingFirstDelegation should be possible here at the moment of writing this comment */}
        {stakingNotifications.includes('pendingFirstDelegation') ? (
          <StakingNotificationBanners notifications={stakingNotifications} />
        ) : (
          <Flex flexDirection="column" gap="$32">
            <StakeFundsBanner balance={totalCoinBalance} />
            <GetStartedSteps />
          </Flex>
        )}
      </>
    );
  }

  return (
    <>
      {showRegisterAsDRepBanner && (
        <Box mb="$28" mt="$32">
          <RegisterAsDRepBanner openExternalLink={openExternalLink} govToolUrl={govToolUrl} />
        </Box>
      )}
      {!isSharedWallet && (
        <Box mb="$40">
          <DelegationCard
            balance={compactNumber(balancesBalance.available.coinBalance)}
            cardanoCoinSymbol={walletStoreWalletUICardanoCoin.symbol}
            distribution={displayData.map(({ color, name, onChainPercentage, ros, saturation }) => ({
              color,
              name: name || '-',
              percentage: onChainPercentage,
              ros: ros ? String(ros) : undefined,
              saturation: saturation ? String(saturation) : undefined,
            }))}
            status={currentPortfolio.length === 1 ? 'simple-delegation' : 'multi-delegation'}
          />
        </Box>
      )}
      {stakingNotifications.length > 0 && (
        <Flex mb="$40" flexDirection="column">
          <StakingNotificationBanners notifications={stakingNotifications} />
        </Flex>
      )}
      <Flex justifyContent="space-between" mb="$16">
        <Text.SubHeading>{t('overview.yourPoolsSection.heading')}</Text.SubHeading>
        {!isSharedWallet && (
          <ControlButton.Small
            disabled={pendingDelegationTransaction}
            onClick={onManageClick}
            label={t('overview.yourPoolsSection.manageButtonLabel')}
            data-testid="manage-btn"
          />
        )}
      </Flex>
      {displayData.map((item) => (
        <Box key={item.id} mb="$24" testId="delegated-pool-item">
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
