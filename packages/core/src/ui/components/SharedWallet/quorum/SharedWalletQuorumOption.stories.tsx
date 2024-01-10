import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletQuorumOption } from './SharedWalletQuorumOption.component';
import { ReactComponent as UserGroupIcon } from '../../../assets/icons/user-group-gradient.component.svg';

const meta: Meta<typeof SharedWalletQuorumOption> = {
  title: 'Shared Wallets | Set Quorum',
  component: SharedWalletQuorumOption,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof SharedWalletQuorumOption>;

export const Option: Story = {
  args: {
    Icon: UserGroupIcon,
    testId: 'shared-wallet-quorum-option',
    title: 'Set Quorum',
    description: 'The minimum amount of people needed to sign a transaction.',
    cosignersSentence: {
      start: 'out of ',
      end: 'cosigners'
    },
    options: {
      allAddresses: 'All addresses must sign',
      anyAddress: 'Any address can sign',
      someAddress: 'Some addresses can sign'
    },
    backButton: 'Back',
    nextButton: 'Next'
  }
};
