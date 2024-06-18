import { ReactComponent as UserGroupIcon } from '@lace/icons/dist/UserGroupGradientComponent';
import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletSetupOption } from './SharedWalletGetStartedOption.component';

const meta: Meta<typeof SharedWalletSetupOption> = {
  component: SharedWalletSetupOption,
  parameters: {
    layout: 'centered',
  },
  title: 'Components / Get Started',
};

export default meta;
type Story = StoryObj<typeof SharedWalletSetupOption>;

export const Option: Story = {
  args: {
    Icon: UserGroupIcon,
    copies: {
      button: 'Create',
      description: 'Create a new shared wallet',
      title: 'New shared wallet',
    },
    testId: 'shared-wallet-setup-option',
  },
};
