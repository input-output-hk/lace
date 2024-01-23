import type { Meta, StoryObj } from '@storybook/react';
import { QuorumOption } from './QuorumOption.component';
import { ReactComponent as UserGroupIcon } from '@lace/icons/dist/UserGroupComponent';

const meta: Meta<typeof QuorumOption> = {
  title: 'Shared Wallets / Quorum option',
  component: QuorumOption,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof QuorumOption>;

export const Option: Story = {
  args: {
    Icon: UserGroupIcon,
    translations: {
      title: 'Set Quorum',
      description: 'The minimum amount of people needed to sign a transaction.',
      cosignersSentence: {
        start: 'out of ',
        end: 'cosigners'
      },
      navigationButtons: {
        back: 'Back',
        next: 'Next'
      }
    },
    radioButtonOptions: {
      allAddresses: 'All addresses must sign',
      anyAddress: 'Any address can sign',
      someAddress: 'Some addresses can sign'
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
