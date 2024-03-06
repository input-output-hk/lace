import type { Meta, StoryObj } from '@storybook/react';

import { DappTransaction } from './DappTransaction';
import { ComponentProps } from 'react';
import { Wallet } from '@lace/cardano';

const meta: Meta<typeof DappTransaction> = {
  title: 'DappTransaction',
  component: DappTransaction,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof DappTransaction>;

const data: ComponentProps<typeof DappTransaction> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
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
    type: Wallet.Cip30TxType.Mint
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
