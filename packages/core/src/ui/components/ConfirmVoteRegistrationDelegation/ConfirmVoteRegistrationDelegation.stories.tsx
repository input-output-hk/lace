import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmVoteRegistrationDelegation } from './ConfirmVoteRegistrationDelegation';
import { ComponentProps } from 'react';

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '360px',
      height: '600'
    }
  }
};

const meta: Meta<typeof ConfirmVoteRegistrationDelegation> = {
  title: 'Sanchonet/Certificates/ConfirmVoteRegistrationDelegation',
  component: ConfirmVoteRegistrationDelegation,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ConfirmVoteRegistrationDelegation>;

const data: ComponentProps<typeof ConfirmVoteRegistrationDelegation> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  translations: {
    labels: {
      drepId: 'DRep ID',
      alwaysAbstain: 'Abstain',
      alwaysNoConfidence: 'No Confidence',
      depositPaid: 'Deposit paid',
      stakeKeyHash: 'Stake key hash'
    },
    option: 'Yes',
    metadata: 'Metadata'
  },
  metadata: {
    drepId: 'drep1ruvgm0auzdplfn7g2jf3kcnpnw5mlhwxaxj8crag8h6t2ye9y9g',
    alwaysAbstain: false,
    alwaysNoConfidence: false,
    depositPaid: '0.35 ADA',
    stakeKeyHash: '13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d0'
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
      ...data.metadata,
      drepId: undefined,
      alwaysAbstain: true,
      alwaysNoConfidence: false
    }
  }
};

export const WithNoConfidence: Story = {
  args: {
    ...data,
    metadata: {
      ...data.metadata,
      drepId: undefined,
      alwaysAbstain: false,
      alwaysNoConfidence: true
    }
  }
};
