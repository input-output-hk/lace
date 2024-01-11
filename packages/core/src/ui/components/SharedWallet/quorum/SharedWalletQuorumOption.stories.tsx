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
    title: 'Set Quorum',
    description: 'The minimum amount of people needed to sign a transaction.',
    cosignersSentence: {
      start: 'out of ',
      end: 'cosigners'
    },
    radioButtonOptions: {
      allAddresses: 'All addresses must sign',
      anyAddress: 'Any address can sign',
      someAddress: 'Some addresses can sign'
    },
    navigationButtons: {
      back: 'Back',
      next: 'Next'
    },
    cosignerValue: [
      {
        label: '1',
        value: '1'
      },
      {
        label: '2',
        value: '2'
      },
      {
        label: '3',
        value: '3'
      },
      {
        label: '4',
        value: '4'
      },
      {
        label: '5',
        value: '5'
      }
    ]
  }
};
