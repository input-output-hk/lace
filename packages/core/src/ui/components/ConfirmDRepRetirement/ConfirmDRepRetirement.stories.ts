import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmDRepRetirement } from './ConfirmDRepRetirement';
import { ComponentProps } from 'react';

const meta: Meta<typeof ConfirmDRepRetirement> = {
  title: 'ConfirmDRepRetirement',
  component: ConfirmDRepRetirement,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof ConfirmDRepRetirement>;

const data: ComponentProps<typeof ConfirmDRepRetirement> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  translations: {
    labels: {
      depositReturned: 'Deposit paid',
      drepId: 'Drep ID'
    },
    metadata: 'Metadata'
  },
  metadata: {
    depositReturned: '0.35 ADA',
    drepId: '65ge6g54g5dd5'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
export const WithError: Story = {
  args: {
    ...data,
    errorMessage: 'Something went wrong'
  }
};
