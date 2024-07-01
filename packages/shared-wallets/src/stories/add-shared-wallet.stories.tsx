import { Meta, StoryObj } from '@storybook/react';
import { SharedWalletStorybookHelper } from './SharedWalletStorybookHelper';

const meta: Meta<typeof SharedWalletStorybookHelper> = {
  component: SharedWalletStorybookHelper,
  title: 'Main / Add shared wallet',
};

export default meta;

type Story = StoryObj<typeof SharedWalletStorybookHelper>;

export const Closed: Story = {
  render: () => <SharedWalletStorybookHelper />,
};

export const Open: Story = {
  render: () => <SharedWalletStorybookHelper modalOpen />,
};

const sharedKeys = 'addr_shared_vksdhgfsft578s6tf68tdsf,stake_shared_vkgyufieus65cuv76s5vrs7';
export const KeysAvailable: Story = {
  render: () => <SharedWalletStorybookHelper activeWalletSharedKeys={sharedKeys} modalOpen />,
};
