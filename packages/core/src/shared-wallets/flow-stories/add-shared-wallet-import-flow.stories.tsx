import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  AddSharedWalletFlowType,
  AddSharedWalletStorybookHelper,
  sharedWalletKey,
} from './AddSharedWalletStorybookHelper';

const meta: Meta<typeof AddSharedWalletStorybookHelper> = {
  component: AddSharedWalletStorybookHelper,
  parameters: {
    chromatic: { disableSnapshot: true },
    decorators: {
      colorSchema: false,
    },
  },
  title: 'Shared Wallets / Flows / Add shared wallet - Import',
};

export default meta;

type Story = StoryObj<typeof AddSharedWalletStorybookHelper>;

export const Import: Story = {
  name: 'Import',
  render: () => (
    <AddSharedWalletStorybookHelper
      activeWalletSharedKey={sharedWalletKey}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Import}
    />
  ),
};
