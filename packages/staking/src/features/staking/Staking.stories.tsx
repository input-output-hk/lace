import type { Story } from '@ladle/react';
import { Staking } from './Staking';

export const StakingStory: Story = () => <Staking />;

StakingStory.args = {
  test: true,
};
