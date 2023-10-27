import type { Meta, StoryObj } from '@storybook/react';

import { TreasuryWithdrawalsAction } from './TreasuryWithdrawalsAction';
import { ComponentProps } from 'react';

const meta: Meta<typeof TreasuryWithdrawalsAction> = {
  title: 'TreasuryWithdrawalsAction',
  component: TreasuryWithdrawalsAction,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof TreasuryWithdrawalsAction>;

const data: ComponentProps<typeof TreasuryWithdrawalsAction> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  data: {
    procedure: {
      deposit: '2000',
      rewardAccount: 'stake1u89sasnfyjtmgk8ydqfv3fdl52f36x3djedfnzfc9rkgzrcss5vgr',
      anchor: {
        hash: '0000000000000000000000000000000000000000000000000000000000000000',
        url: 'https://www.someurl.io',
        txHashUrl: 'https://www.someurl.io'
      }
    },
    withdrawals: [
      {
        rewardAccount: 'stake1u89sasnfyjtmgk8ydqfv3fdl52f36x3djedfnzfc9rkgzrcss5vgr',
        lovelace: '1030939916423'
      }
    ]
  },
  translations: {
    procedure: {
      anchor: {
        hash: 'Anchor Hash',
        url: 'Anchor URL'
      },
      deposit: 'Deposit',
      rewardAccount: 'Reward account',
      title: 'Procedure'
    },
    withdrawals: {
      title: 'Withdrawal Details',
      lovelace: 'Lovelace Withdrawn',
      rewardAccount: 'Reward account'
    }
  }
};

export const Overview: Story = {
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
