import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmVoteDelegation } from './ConfirmVoteDelegation';
import { ComponentProps } from 'react';

const meta: Meta<typeof ConfirmVoteDelegation> = {
  title: 'ConfirmVoteDelegation',
  component: ConfirmVoteDelegation,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof ConfirmVoteDelegation>;

const data: ComponentProps<typeof ConfirmVoteDelegation> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  translations: {
    labels: {
      drepId: 'Drep ID',
      alwaysAbstain: 'Abstain',
      alwaysNoConfidence: 'No Confidence'
    },
    option: 'Yes',
    metadata: 'Metadata'
  },
  metadata: {
    drepId: 'drep1ruvgm0auzdplfn7g2jf3kcnpnw5mlhwxaxj8crag8h6t2ye9y9g',
    alwaysAbstain: false,
    alwaysNoConfidence: false
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

export const WithAbstain: Story = {
  args: {
    ...data,
    metadata: {
      alwaysAbstain: true,
      alwaysNoConfidence: false
    }
  }
};

export const WithNoConfidence: Story = {
  args: {
    ...data,
    metadata: {
      alwaysAbstain: false,
      alwaysNoConfidence: true
    }
  }
};
