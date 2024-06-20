import { Meta, StoryObj } from '@storybook/react';
import { AddSharedWalletStorybookHelper } from './AddSharedWalletStorybookHelper';

const meta: Meta<typeof AddSharedWalletStorybookHelper> = {
  component: AddSharedWalletStorybookHelper,
  title: 'Main / Add shared wallet',
};

export default meta;

type Story = StoryObj<typeof AddSharedWalletStorybookHelper>;

export const Closed: Story = {
  render: () => <AddSharedWalletStorybookHelper />,
};

export const Open: Story = {
  render: () => <AddSharedWalletStorybookHelper modalOpen />,
};

const sharedKeys = 'addr_shared_vksdhgfsft578s6tf68tdsf,stake_shared_vkgyufieus65cuv76s5vrs7';
export const KeysAvailable: Story = {
  render: () => <AddSharedWalletStorybookHelper activeWalletSharedKeys={sharedKeys} modalOpen />,
};
