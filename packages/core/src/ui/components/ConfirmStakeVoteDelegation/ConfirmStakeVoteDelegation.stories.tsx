import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmStakeVoteDelegation } from './ConfirmStakeVoteDelegation';
import { ComponentProps } from 'react';

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '720px',
      height: '600'
    }
  }
};

const meta: Meta<typeof ConfirmStakeVoteDelegation> = {
  title: 'Sanchonet/Certificates/ConfirmStakeVoteDelegation',
  component: ConfirmStakeVoteDelegation,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ConfirmStakeVoteDelegation>;

const data: ComponentProps<typeof ConfirmStakeVoteDelegation> = {
  metadata: {
    drepId: 'drep1ruvgm0auzdplfn7g2jf3kcnpnw5mlhwxaxj8crag8h6t2ye9y9g',
    alwaysAbstain: false,
    alwaysNoConfidence: false,
    stakeKeyHash: '13cf55d175ea848b87deb3e914febd7e028e2bf6534475d52fb9c3d0',
    poolId: 'pool1zuevzm3xlrhmwjw87ec38mzs02tlkwec9wxpgafcaykmwg7efhh'
  }
};

export const Overview: Story = {
  args: {
    ...data
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
