import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmVoteDelegation } from './ConfirmVoteDelegation';
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

const meta: Meta<typeof ConfirmVoteDelegation> = {
  title: 'Sanchonet/Certificates/ConfirmVoteDelegation',
  component: ConfirmVoteDelegation,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ConfirmVoteDelegation>;

const data: ComponentProps<typeof ConfirmVoteDelegation> = {
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
