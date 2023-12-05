import type { Meta, StoryObj } from '@storybook/react';

import { TreasuryWithdrawalsAction } from './TreasuryWithdrawalsAction';
import { ComponentProps } from 'react';

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '360px',
      height: '600'
    }
  }
};

const meta: Meta<typeof TreasuryWithdrawalsAction> = {
  title: 'ProposalProcedure/TreasuryWithdrawalsAction',
  component: TreasuryWithdrawalsAction,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
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
    txDetails: {
      txType: 'Treasury Withdrawals',
      deposit: '2000',
      rewardAccount: 'stake1u89sasnfyjtmgk8ydqfv3fdl52f36x3djedfnzfc9rkgzrcss5vgr'
    },
    procedure: {
      anchor: {
        hash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
        url: 'https://www.someurl.io',
        txHashUrl: 'https://www.someurl.io'
      }
    },
    withdrawals: [
      {
        rewardAccount: 'stake1u89sasnfyjtmgk8ydqfv3fdl52f36x3djedfnzfc9rkgzrcss5vgr',
        lovelace: '1030939916423'
      }
    ],
    actionId: {
      index: '0',
      txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
      txHashUrl:
        'https://cexplorer.io/address/addr1q9wlvfl74g9h8txw5v0lfew2gjsw9z56d5kj8mmv5d8tudcx9eh8zefr3cxuje02lu6tgy083xkl39rr5xkj483vvd6q8nlapq'
    }
  },
  translations: {
    txDetails: {
      title: 'Transaction Details',
      txType: 'Transaction Type',
      deposit: 'Deposit',
      rewardAccount: 'Reward account'
    },
    procedure: {
      anchor: {
        hash: 'Anchor Hash',
        url: 'Anchor URL'
      },
      title: 'Procedure'
    },
    actionId: {
      title: 'Action ID',
      index: 'Index',
      txHash: 'TX Hash'
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
