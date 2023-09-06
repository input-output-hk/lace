import { InfoCircleOutlined } from '@ant-design/icons';
import { Wallet } from '@lace/cardano';
import { Banner, useObservable } from '@lace/common';
import { Box, ControlButton, Flex, Text } from '@lace/ui';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import {
  PortfolioManagementProcess,
  Sections,
  sectionsConfig,
  useDelegationPortfolioStore,
  useStakePoolDetails,
} from '../store';
import { DelegationCard } from './DelegationCard';
import { FundWalletBanner } from './FundWalletBanner';
import { GetStartedSteps } from './GetStartedSteps';
import { hasMinimumFundsToDelegate, hasPendingDelegationTransaction, mapPortfolioToDisplayData } from './helpers';
import * as styles from './Overview.css';
import { StakeFundsBanner } from './StakeFundsBanner';
import { StakingInfoCard } from './staking-info-card';

export const Overview = () => {
  const { t } = useTranslation();
  const {
    walletStoreWalletUICardanoCoin,
    balancesBalance,
    compactNumber,
    fetchCoinPricePriceResult,
    delegationStoreSetSelectedStakePool: setSelectedStakePool,
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
  const { setIsDrawerVisible, setSection } = useStakePoolDetails((state) => ({
    setIsDrawerVisible: state.setIsDrawerVisible,
    setSection: state.setSection,
  }));

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

  const onStakePoolOpen = (stakePool: Wallet.Cardano.StakePool) => {
    setSelectedStakePool(stakePool);
    setIsDrawerVisible(true);
  };
  const pendingDelegationTransaction = hasPendingDelegationTransaction(walletActivities);

  const onManageClick = () => {
    portfolioMutators.beginManagementProcess(PortfolioManagementProcess.CurrentPortfolio);
    setSection(sectionsConfig[Sections.PREFERENCES]);
    setIsDrawerVisible(true);
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
        {pendingDelegationTransaction ? (
          <Banner
            withIcon
            customIcon={<InfoCircleOutlined className={styles.bannerInfoIcon} />}
            message={t('overview.banners.pendingFirstDelegation.title')}
            description={t('overview.banners.pendingFirstDelegation.message')}
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
            cardanoCoinSymbol="tADA"
            onStakePoolSelect={() => onStakePoolOpen(item.stakePool)}
          />
        </Box>
      ))}
    </>
  );
};
