import { useState } from 'react';
import type { Meta } from '@storybook/react';
import { DelegationRatioSlider } from './DelegationRatioSlider';

export default {
  title: 'Drawer/DelegationRatioSlider',
} as Meta;

export const Controlled = () => {
  const DEFAULT_VALUE = 50;
  const [value, setValue] = useState(DEFAULT_VALUE);
  return <DelegationRatioSlider onValueChange={setValue} value={value} />;
};

export const Uncontrolled = () => <DelegationRatioSlider defaultValue={33} />;
