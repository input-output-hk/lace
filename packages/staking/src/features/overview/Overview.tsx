import { Wallet } from '@lace/cardano';
import {
  Box,
  ControlButton,
  Flex,
  PIE_CHART_DEFAULT_COLOR_SET,
  PieChartColor,
  PieChartGradientColor,
  Text,
} from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore, useStakePoolDetails } from '../store';
import { DelegationCard } from './DelegationCard';
import { StakingInfoCard } from './staking-info-card';

const SATURATION_UPPER_BOUND = 100;

export const Overview = () => {
  const { t } = useTranslation();
  const {
    walletStoreWalletUICardanoCoin,
    balancesBalance,
    stakingRewards,
    fetchCoinPricePriceResult,
    delegationStoreSetSelectedStakePool: setSelectedStakePool,
    delegationDetails,
  } = useOutsideHandles();
  const currentPortfolio = useDelegationPortfolioStore((store) => store.currentPortfolio);
  const setIsDrawerVisible = useStakePoolDetails((state) => state.setIsDrawerVisible);

  const onStakePoolOpen = () => {
    setSelectedStakePool(delegationDetails);
    setIsDrawerVisible(true);
  };

  if (currentPortfolio.length === 0) return <Text.SubHeading>Start staking</Text.SubHeading>;

  const weightsSum = currentPortfolio.reduce((sum, { weight }) => sum + weight, 0);

  const displayData = currentPortfolio.map((item, index) => ({
    ...item,
    ...item.displayData,
    cardanoCoin: walletStoreWalletUICardanoCoin,
    coinBalance: (() => {
      const balance = balancesBalance?.total?.coinBalance ? Number(balancesBalance?.total?.coinBalance) : 0;
      return balance * (item.weight / weightsSum);
    })(),
    color: PIE_CHART_DEFAULT_COLOR_SET[index] as PieChartColor,
    fiat: fetchCoinPricePriceResult?.cardano?.price,
    lastReward: Wallet.util.lovelacesToAdaString(stakingRewards.lastReward.toString()),
    status: ((): 'retired' | 'saturated' | undefined => {
      if (item.displayData.retired) return 'retired';
      if (Number(item.displayData.saturation || 0) > SATURATION_UPPER_BOUND) return 'saturated';
      // eslint-disable-next-line consistent-return, unicorn/no-useless-undefined
      return undefined;
    })(),
    totalRewards: Wallet.util.lovelacesToAdaString(stakingRewards.totalRewards.toString()),
  }));

  if (displayData.length === 1) {
    displayData.forEach((item) => (item.color = PieChartGradientColor.LaceLinearGradient));
  }

  return (
    <>
      <Box mb={'$40'}>
        <DelegationCard
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
        <ControlButton.Outlined label={t('overview.yourPoolsSection.manageButtonLabel')} />
      </Flex>
      {displayData.map((item) => (
        <Box key={item.id} mb={'$24'}>
          <StakingInfoCard
            {...item}
            markerColor={displayData.length > 1 ? item.color : undefined}
            cardanoCoinSymbol={'tADA'}
            onStakePoolSelect={onStakePoolOpen}
          />
        </Box>
      ))}
    </>
  );
};
