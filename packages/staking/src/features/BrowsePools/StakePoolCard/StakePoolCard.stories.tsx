import type { Meta } from '@storybook/react';
import { StakePoolCard, StakePoolCardProps } from './StakePoolCard';
import { MetricType } from './types';

export default {
  title: 'StakePoolsGrid/StakePoolCard',
} as Meta;

const metricTypeOptions: MetricType[] = ['blocks', 'cost', 'margin', 'pledge', 'saturation', 'live-stake', 'ticker'];

export const Card = {
  argTypes: {
    metricType: {
      control: { options: metricTypeOptions, type: 'select' },
    },
  },
  args: {
    metricType: 'blocks',
    metricValue: 123_456,
    saturation: 51.75,
    selected: false,
    ticker: 'TIKRNM',
  } as StakePoolCardProps,
  render: (props: StakePoolCardProps) => (
    <div style={{ width: 220 }}>
      <StakePoolCard {...props} />
    </div>
  ),
};
