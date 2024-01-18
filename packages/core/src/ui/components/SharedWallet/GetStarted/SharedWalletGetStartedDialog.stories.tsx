import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletGetStartedOptions } from './SharedWalletGetStartedDialog.component';

const meta: Meta<typeof SharedWalletGetStartedOptions> = {
  title: 'Shared Wallets / Get Started',
  component: SharedWalletGetStartedOptions,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof SharedWalletGetStartedOptions>;

export const Dialog: Story = {
  args: {
    translations: {
      title: 'Hello Web 3',
      subTitle: 'Choose an option to get started',
      createSharedWalletOption: {
        title: 'New shared wallet',
        description: 'Create a new shared wallet',
        button: 'Create'
      },
      importSharedWalletOption: {
        title: 'Import shared wallet',
        description: 'Join a shared wallet from JSON file or chain sync',
        button: 'Connect'
      }
    }
  }
};
