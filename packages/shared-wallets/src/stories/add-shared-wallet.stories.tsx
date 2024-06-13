import { Meta, StoryObj } from '@storybook/react';
import { AddSharedWalletFlow } from './AddSharedWalletFlow';

const meta: Meta<typeof AddSharedWalletFlow> = {
  component: AddSharedWalletFlow,
  title: 'Main / Add shared wallet',
};

export default meta;

type Story = StoryObj<typeof AddSharedWalletFlow>;

export const Closed: Story = {
  render: () => <AddSharedWalletFlow />,
};

export const Open: Story = {
  render: () => <AddSharedWalletFlow modalOpen />,
};
