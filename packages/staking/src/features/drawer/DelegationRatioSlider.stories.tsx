import { Story, StoryDefault } from '@ladle/react';
import { useState } from 'react';
import { DelegationRatioSlider } from './DelegationRatioSlider';

export const Basic: Story = () => {
  const DEFAULT_VALUE = 50;
  const [value, setValue] = useState([DEFAULT_VALUE]);
  return <DelegationRatioSlider onValueChange={setValue} value={value} />;
};

const storyDefault: StoryDefault = {
  title: 'DelegationRatioSlider',
};

export default storyDefault;
