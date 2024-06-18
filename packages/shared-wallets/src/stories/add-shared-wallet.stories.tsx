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
