import type { Meta, StoryObj } from '@storybook/react';

import { DappTransaction } from './DappTransaction';
import { ComponentProps } from 'react';

const meta: Meta<typeof DappTransaction> = {
  title: 'DappTransaction',
  component: DappTransaction,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof DappTransaction>;

const data: ComponentProps<typeof DappTransaction> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  translations: {
    recipient: 'Recipient',
    amount: 'Amount',
    adaFollowingNumericValue: 'ADA',
    fee: 'Fee',
    transaction: 'Transaction'
  },
  transaction: {
    fee: '0.17',
    outputs: [
      {
        coins: '1',
        recipient:
          'addr_test1qrl0s3nqfljv8dfckn7c4wkzu5rl6wn4hakkddcz2mczt3szlqss933x0aag07qcgspcaglmay6ufl4y4lalmlpe02mqhl0fx2'
      }
    ],
    type: 'Mint'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const WithInsufficientFunds: Story = {
  args: {
    ...data
  }
};

export const WithError: Story = {
  args: {
    ...data,
    errorMessage: 'Something went wrong'
  }
};
