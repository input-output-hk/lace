import { Box, Button, Flex, Text } from '@lace/ui';
import { StakingInfoCard } from './staking-info-card';

const data = {
  staked: [
    {
      apy: 0,
      coinBalance: 10,
      fee: 340,
      id: 'ADACT',
      lastReward: '5',
      margin: '0',
      name: 'ADA Capital',
      totalRewards: '10',
    },
    {
      apy: 0,
      coinBalance: 20,
      fee: 340,
      id: 'ANET',
      lastReward: '0',
      margin: '0',
      name: 'AdaNet.io',
      totalRewards: '0',
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
