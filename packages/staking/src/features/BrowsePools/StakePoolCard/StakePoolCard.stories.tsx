import type { Meta } from '@storybook/react';
import { StakePoolCard } from './StakePoolCard';

export default {
  title: 'StakePoolsGrid/StakePoolCard',
} as Meta;

export const Normal = () => (
  <StakePoolCard
    metricType="blocks"
    metricValue={1_222_333}
    onClick={() => console.debug('clicked')}
    saturation={95}
    ticker="OCEAN"
  />
);
