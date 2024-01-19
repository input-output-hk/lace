import type { Meta, StoryObj } from '@storybook/react';

import { WalletSyncing } from './WalletSyncing';
import { ComponentProps } from 'react';

const meta: Meta<typeof WalletSyncing> = {
  title: 'Shared Wallets/Wallet Syncing',
  component: WalletSyncing,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof WalletSyncing>;

const data: ComponentProps<typeof WalletSyncing> = {
  translations: {
    subtitle: 'Loading wallet data',
    title: 'Wallet syncing, please wait...'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
