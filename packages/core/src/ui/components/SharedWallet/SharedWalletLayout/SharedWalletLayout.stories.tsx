import React from 'react';
// import { QuorumOption } from "../Quorum";
import { SharedWalletStepLayout } from './SharedWalletLayout';
import { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof SharedWalletStepLayout> = {
  title: 'Shared Wallets / Shared Wallet Step Layout',
  component: SharedWalletStepLayout,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof SharedWalletStepLayout>;

export const SharedWalletLayout: Story = {
  args: {
    title: 'Shared Wallet Step Layout',
    children: <div>Hello</div>
  }
};
