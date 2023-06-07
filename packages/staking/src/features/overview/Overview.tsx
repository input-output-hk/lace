import { Box, Button, Flex, Text } from '@lace/ui';
import { StakingInfoCard } from './staking-info-card';

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
  ],
};

export const Overview = () => (
  <>
    <Flex justifyContent={'space-between'} mb={'$16'}>
      <Text.SubHeading>Your pools</Text.SubHeading>
      <Button.Primary label={'Manage'} />
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
