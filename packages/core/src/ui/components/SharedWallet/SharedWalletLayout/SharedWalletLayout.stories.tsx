import React from 'react';
import { SharedWalletLayout } from './SharedWalletLayout';
import { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof SharedWalletLayout> = {
  title: 'Shared Wallets / Shared Wallet Step Layout',
  component: SharedWalletLayout,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof SharedWalletLayout>;

export const SharedWalletLayoutComponent: Story = {
  args: {
    title: 'This is the title',
    description: 'You can also specify description',
    children: (
      <>
        <div>as well as</div>
        <h1>children</h1>
      </>
    )
  }
};
