import { Story, StoryDefault } from '@ladle/react';
import { useState } from 'react';
import { DelegationRatioSlider } from './DelegationRatioSlider';

export const Controlled: Story = () => {
  const DEFAULT_VALUE = 50;
  const [value, setValue] = useState(DEFAULT_VALUE);
  return <DelegationRatioSlider onValueChange={setValue} value={value} />;
};

// eslint-disable-next-line react/no-multi-comp
export const Uncontrolled: Story = () => <DelegationRatioSlider defaultValue={33} />;

const storyDefault: StoryDefault = {
  title: 'DelegationRatioSlider',
};

export default storyDefault;
