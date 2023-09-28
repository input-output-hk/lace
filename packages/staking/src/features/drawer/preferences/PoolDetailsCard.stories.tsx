import { Story, StoryDefault } from '@ladle/react';
import { PoolDetailsCard } from './PoolDetailsCard';

export const PoolDetailsCardStory: Story = () => (
  <>
    <PoolDetailsCard
      color="#475"
      name="Pool Name"
      percentage={10}
      onRemove={() => void 0}
      stakeValue="0"
      onExpandButtonClick={() => {}}
      expanded
    />
    <PoolDetailsCard
      color="#475"
      name="Pool Name"
      percentage={10}
      onRemove={() => void 0}
      stakeValue="0"
      onExpandButtonClick={() => {}}
      expanded={false}
    />
  </>
);

const storyDefault: StoryDefault = {
  title: 'Staking',
};

export default storyDefault;
