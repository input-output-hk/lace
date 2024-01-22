import type { Meta, StoryObj } from '@storybook/react';
import { NoSharedWalletFoundDialog } from './NoSharedWalletFoundDialog';

const meta: Meta<typeof NoSharedWalletFoundDialog> = {
  title: 'Shared Wallets/NoSharedWalletFoundDialog',
  component: NoSharedWalletFoundDialog,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof NoSharedWalletFoundDialog>;

const noop = (): void => void 0;

export const Overview: Story = {
  args: {
    open: true,
    translations: {
      title: 'No shared wallet found',
      description: 'Please try again',
      confirm: 'Proceed'
    },
    events: {
      onCancel: noop,
      onConfirm: noop,
      onOpenChanged: noop
    }
  }
};
