import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletSetupOption } from './SharedWalletGetStartedOption.component';
import { ReactComponent as UserGroupIcon } from '../../../assets/icons/user-group-gradient.component.svg';

const meta: Meta<typeof SharedWalletSetupOption> = {
  title: 'Shared Wallets / Get Started',
  component: SharedWalletSetupOption,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof SharedWalletSetupOption>;

export const Option: Story = {
  args: {
    Icon: UserGroupIcon,
    testId: 'shared-wallet-setup-option',
    copies: {
      title: 'New shared wallet',
      description: 'Create a new shared wallet',
      button: 'Create'
    }
  }
};
