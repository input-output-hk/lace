import type { Meta, StoryObj } from '@storybook/react';

import { OutputSummary } from './OutputSummary';
import { ComponentProps } from 'react';
import { Wallet } from '@lace/cardano';

const meta: Meta<typeof OutputSummary> = {
  title: 'OutputSummary',
  component: OutputSummary,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof OutputSummary>;

const ownAddress = Wallet.Cardano.PaymentAddress(
  'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
);

const data: ComponentProps<typeof OutputSummary> = {
  list: [
    {
      assetAmount: '1 ADA',
      fiatAmount: '1000 USD'
    },
    {
      assetAmount: '1 NFT',
      fiatAmount: '-'
    },
    {
      assetAmount: '1234 FT',
      fiatAmount: '100 USD'
    },
    {
      assetAmount: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198775348494241 FT',
      fiatAmount: '1 USD'
    }
  ],
  recipientAddress: ownAddress,
  recipientName: 'My Address',
  translations: {
    recipientAddress: 'Recipient address',
    sending: 'Sending'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const OwnAddress: Story = {
  args: {
    ownAddresses: [ownAddress],
    ...data
  }
};
