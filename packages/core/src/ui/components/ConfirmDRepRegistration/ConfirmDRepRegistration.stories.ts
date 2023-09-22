import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmDRepRegistration } from './ConfirmDRepRegistration';
import { ComponentProps } from 'react';

const meta: Meta<typeof ConfirmDRepRegistration> = {
  title: 'ConfirmDRepRegistration',
  component: ConfirmDRepRegistration,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof ConfirmDRepRegistration>;

const data: ComponentProps<typeof ConfirmDRepRegistration> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  translations: {
    labels: {
      depositPaid: 'Deposit paid',
      drepId: 'Drep ID',
      hash: 'Hash',
      url: 'URL'
    },
    metadata: 'Metadata',
    insufficientFundsWarning: 'You do not have enough funds to complete the transaction'
  },
  metadata: {
    depositPaid: '0.35 ADA',
    drepId: '65ge6g54g5dd5',
    hash: '9bba8233cdd086f0325daba465d568a88970d42536f9e71e92a80d5922ded885',
    url: 'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
  },
  hasInsufficientFunds: false
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const WithInsufficientFunds: Story = {
  args: {
    ...data,
    hasInsufficientFunds: true
  }
};

export const WithError: Story = {
  args: {
    ...data,
    errorMessage: 'Something went wrong'
  }
};
