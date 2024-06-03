import type { Meta, StoryObj } from '@storybook/react';

import { Customize } from './Customize';

const meta: Meta<typeof Customize> = {
  title: 'Nami Migration/Customise your wallet',
  component: Customize,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof Customize>;

export const Overview: Story = {
  parameters: {
    decorators: {
      layout: 'vertical'
    }
  }
};
