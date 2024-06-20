import { Meta, StoryObj } from '@storybook/react';
import { SharedWalletLayout } from './SharedWalletLayout';

const meta: Meta<typeof SharedWalletLayout> = {
  component: SharedWalletLayout,
  parameters: {
    layout: 'centered',
  },
  title: 'Components / Shared Wallet Step Layout',
};

export default meta;

type Story = StoryObj<typeof SharedWalletLayout>;

export const SharedWalletLayoutComponent: Story = {
  args: {
    children: (
      <>
        <div>as well as</div>
        <h1>children</h1>
      </>
    ),
    description: 'You can also specify description',
    title: 'This is the title',
  },
};
