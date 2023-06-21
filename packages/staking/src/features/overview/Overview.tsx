import { Box, ControlButton, Flex, PIE_CHART_DEFAULT_COLOR_SET, PieChartColor, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { DelegationCard } from './DelegationCard';
import { StakingInfoCard } from './staking-info-card';

// TODO: consume real data once SDK side is ready
const data = {
  staked: [
    {
      apy: 0,
      coinBalance: '10',
      coinBalanceFiat: '3.40',
      fee: 2,
      id: 'ADACT',
      lastReward: '5',
      lastRewardFiat: '1.70',
      margin: '0',
      name: 'ADA Capital',
      totalRewards: '10',
      totalRewardsFiat: '3.40',
    },
    {
      apy: 0,
      coinBalance: '20',
      coinBalanceFiat: '6.80',
      fee: 2,
      id: 'ANET',
      lastReward: '5',
      lastRewardFiat: '1.70',
      margin: '0',
      name: 'AdaNet.io',
      totalRewards: '5',
      totalRewardsFiat: '1.70',
    },
  ].map((item, index) => ({
    ...item,
    color: PIE_CHART_DEFAULT_COLOR_SET[index] as PieChartColor,
  })),
};

export const Overview = () => {
  const { t } = useTranslation();

  return (
    <>
      <Box mb={'$40'}>
        <DelegationCard
          distribution={data.staked.map(({ color, name, coinBalance }) => ({
            color,
            name,
            value: Number(coinBalance),
          }))}
          status={'multi-staking'}
        />
      </Box>
      <Flex justifyContent={'space-between'} mb={'$16'}>
        <Text.SubHeading>{t('overview.yourPoolsSection.heading')}</Text.SubHeading>
        <ControlButton.Outlined label={t('overview.yourPoolsSection.manageButtonLabel')} />
      </Flex>
      {data.staked.map((item) => (
        <Box key={item.id} mb={'$24'}>
          <StakingInfoCard
            {...item}
            cardanoCoinSymbol={'tADA'}
            onStakePoolSelect={() => console.log('onStakePoolSelect')}
          />
        </Box>
      ))}
    </>
  );
};
