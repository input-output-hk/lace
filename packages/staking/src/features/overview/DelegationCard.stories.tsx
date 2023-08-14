import { PieChartGradientColor } from '@lace/ui';
import { Story, StoryDefault } from '@ladle/react';
import { DelegationCard } from './DelegationCard';

export const DelegationCardStory: Story = () => (
  <>
    <DelegationCard
      arrangement={'horizontal'}
      balance={'10000'}
      cardanoCoinSymbol={'ADA'}
      distribution={[{ color: PieChartGradientColor.LaceLinearGradient, name: 'A', value: 1 }]}
      status={'ready'}
    />
    <hr />
    <DelegationCard
      arrangement={'vertical'}
      balance={'10000'}
      cardanoCoinSymbol={'ADA'}
      distribution={[{ color: PieChartGradientColor.LaceLinearGradient, name: 'A', value: 1 }]}
      status={'ready'}
    />
  </>
);

const storyDefault: StoryDefault = {
  title: 'Staking',
};

export default storyDefault;
