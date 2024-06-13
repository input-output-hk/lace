import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletGetStartedOptions } from './SharedWalletGetStartedDialog.component';

const meta: Meta<typeof SharedWalletGetStartedOptions> = {
  component: SharedWalletGetStartedOptions,
  parameters: {
    layout: 'centered',
  },
  title: 'Components / Get Started',
};

export default meta;
type Story = StoryObj<typeof SharedWalletGetStartedOptions>;

export const Dialog: Story = {
  args: {
    translations: {
      createSharedWalletOption: {
        button: 'Create',
        description: 'Create a new shared wallet',
        title: 'New shared wallet',
      },
      importSharedWalletOption: {
        button: 'Connect',
        description: 'Join a shared wallet from JSON file or chain sync',
        title: 'Import shared wallet',
      },
      subTitle: 'Choose an option to get started',
      title: 'Hello Web 3',
    },
  },
};
