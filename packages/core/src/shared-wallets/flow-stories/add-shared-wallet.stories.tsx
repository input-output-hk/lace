import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AddSharedWalletStorybookHelper, sharedWalletKey } from './AddSharedWalletStorybookHelper';

const meta: Meta<typeof AddSharedWalletStorybookHelper> = {
  component: AddSharedWalletStorybookHelper,
  parameters: {
    chromatic: { disableSnapshot: true },
    decorators: {
      colorSchema: false,
    },
  },
  title: 'Shared Wallets / Flows / Add shared wallet',
};

export default meta;

type Story = StoryObj<typeof AddSharedWalletStorybookHelper>;

export const Closed: Story = {
  render: () => <AddSharedWalletStorybookHelper />,
};

export const OpenNoKeys: Story = {
  name: 'Open - no key',
  render: () => <AddSharedWalletStorybookHelper modalOpen />,
};

export const OpenKeysAvailable: Story = {
  name: 'Open - key available',
  render: () => <AddSharedWalletStorybookHelper activeWalletSharedKey={sharedWalletKey} modalOpen />,
};
