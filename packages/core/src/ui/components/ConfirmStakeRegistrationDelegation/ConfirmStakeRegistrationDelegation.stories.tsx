import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmStakeRegistrationDelegation } from './ConfirmStakeRegistrationDelegation';
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

const meta: Meta<typeof ConfirmStakeRegistrationDelegation> = {
  title: 'Sanchonet/Certificates/ConfirmStakeRegistrationDelegation',
  component: ConfirmStakeRegistrationDelegation,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ConfirmStakeRegistrationDelegation>;

const data: ComponentProps<typeof ConfirmStakeRegistrationDelegation> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  translations: {
    labels: {
      stakeKeyHash: 'Stake key hash',
      poolId: 'Pool Id',
      depositPaid: 'Deposit paid'
    },
    metadata: 'Metadata'
  },
  metadata: {
    stakeKeyHash: '13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d0',
    poolId: 'pool1zuevzm3xlrhmwjw87ec38mzs02tlkwec9wxpgafcaykmwg7efhh',
    depositPaid: '0.35 ADA'
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
