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
import { stakePoolsMock } from '../stake-pools';
import { useDelegationPortfolioStore } from '../store';
import { DelegationCard } from './DelegationCard';
import { StakingInfoCard } from './staking-info-card';

// eslint-disable-next-line unicorn/no-array-reduce
const stakePoolsByHexId = stakePoolsMock.reduce((acc, item) => {
  acc[item.hexId] = item;
  return acc;
}, {} as Record<Wallet.Cardano.PoolIdHex, Wallet.Cardano.StakePool>);

export const Overview = () => {
  const { t } = useTranslation();
  const { walletStoreWalletUICardanoCoin, balancesBalance, stakingRewards, fetchCoinPricePriceResult } =
    useOutsideHandles();
  const currentPortfolio = useDelegationPortfolioStore((store) => store.currentPortfolio);

  if (currentPortfolio.length === 0) return <Text.SubHeading>Start staking</Text.SubHeading>;

  const displayData = (
    currentPortfolio.map(({ id }) => stakePoolsByHexId[id]).filter(Boolean) as Wallet.Cardano.StakePool[]
  )
    .map((stakePool) => Wallet.util.stakePoolTransformer({ cardanoCoin: walletStoreWalletUICardanoCoin, stakePool }))
    .map((item, index) => ({
      ...item,
      cardanoCoin: walletStoreWalletUICardanoCoin,
      coinBalance: balancesBalance?.total?.coinBalance ? Number(balancesBalance?.total?.coinBalance) : 0,
      color: PIE_CHART_DEFAULT_COLOR_SET[index] as PieChartColor,
      fiat: fetchCoinPricePriceResult?.cardano?.price,
      lastReward: Wallet.util.lovelacesToAdaString(stakingRewards.lastReward.toString()),
      totalRewards: Wallet.util.lovelacesToAdaString(stakingRewards.totalRewards.toString()),
    }));

  if (displayData.length === 1) {
    displayData.forEach((item) => (item.color = PieChartGradientColor.LaceLinearGradient));
  }

  return (
    <>
      <Box mb={'$40'}>
        <DelegationCard
          distribution={displayData.map(({ color, name = '-', coinBalance }) => ({
            color,
            name,
            value: Number(coinBalance),
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
            onStakePoolSelect={() => console.info('onStakePoolSelect')}
          />
        </Box>
      ))}
    </>
  );
};
