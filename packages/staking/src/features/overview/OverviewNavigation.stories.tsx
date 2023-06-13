import type { Story, StoryDefault } from '@ladle/react';
import { OverviewNavigation } from './OverviewNavigation';

export const BasicStory: Story<{ onValueChange: (newValue: string) => void }> = ({ onValueChange }) => (
  <OverviewNavigation onValueChange={onValueChange} />
);

BasicStory.argTypes = {
  onValueChange: {
    action: 'valueChanged',
  },
};

const storyDefault: StoryDefault = {
  title: 'Overview / Staking Overview Navigation',
};

// eslint-disable-next-line import/no-default-export
export default storyDefault;
