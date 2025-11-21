import type { Meta, StoryObj } from '@storybook/react';

import { MidnightEventBanner } from './MidnightEventBanner';
import { ComponentProps } from 'react';

const meta: Meta<typeof MidnightEventBanner> = {
  title: 'Midnight/Event Banner',
  component: MidnightEventBanner,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof MidnightEventBanner>;

const data: ComponentProps<typeof MidnightEventBanner> = {
  translations: {
    description:
      'The free, multi-phase distribution of NIGHT tokens aimed at empowering a broad, diverse community to build the future of the Midnight network',
    title: 'Discover the Midnight Token Distribution',
    reminder: 'Remind me later',
    learnMore: 'Learn more'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
