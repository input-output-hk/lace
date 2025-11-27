import type { Meta, StoryObj } from '@storybook/react';

import { Welcome } from './Welcome';

const meta: Meta<typeof Welcome> = {
  title: 'Nami Migration/Welcome',
  component: Welcome,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof Welcome>;

export const Overview: Story = {
  parameters: {
    decorators: {
      layout: 'vertical'
    }
  }
};
