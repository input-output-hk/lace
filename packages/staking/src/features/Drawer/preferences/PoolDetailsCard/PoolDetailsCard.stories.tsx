import { Flex } from '@lace/ui';
import type { Meta } from '@storybook/react';
import { PoolDetailsCard } from './';

export default {
  title: 'Drawer/PoolDetailsCard',
} as Meta;

// TODO https://input-output.atlassian.net/browse/LW-9492
export const Overview = () => (
  <Flex gap="$24" flexDirection="column" alignItems="stretch">
    <PoolDetailsCard
      color="#475"
      name="Pool Name"
      actualPercentage={25}
      onRemove={() => void 0}
      stakeValue="10,000.00"
      cardanoCoinSymbol="ADA"
      savedPercentage={30}
      targetPercentage={30}
      onPercentageChange={(nextValue) => console.info('changed 1:', nextValue)}
      defaultExpand
    />

    <PoolDetailsCard
      color="#475"
      name="Pool Name"
      actualPercentage={10}
      onRemove={() => void 0}
      stakeValue="4,000.00"
      targetPercentage={10}
      cardanoCoinSymbol="ADA"
      onPercentageChange={(nextValue) => console.info('changed 2:', nextValue)}
    />
  </Flex>
);
