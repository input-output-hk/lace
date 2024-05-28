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
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna',
    title: 'Participate in the\nMidnight Pre-Launch Event',
    reminder: 'Remind me later',
    moreDetails: 'More details'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
