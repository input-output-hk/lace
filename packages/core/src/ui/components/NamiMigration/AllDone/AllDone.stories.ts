import type { Meta, StoryObj } from '@storybook/react';

import { AllDone } from './AllDone';

const meta: Meta<typeof AllDone> = {
  title: 'Nami Migration/All Done',
  component: AllDone,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof AllDone>;

export const Overview: Story = {
  parameters: {
    decorators: {
      layout: 'vertical'
    }
  }
};
