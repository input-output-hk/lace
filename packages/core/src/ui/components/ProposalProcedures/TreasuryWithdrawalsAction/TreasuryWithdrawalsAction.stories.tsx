import type { Meta, StoryObj } from '@storybook/react';

import { TreasuryWithdrawalsAction } from './TreasuryWithdrawalsAction';
import { ComponentProps } from 'react';

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '720px',
      height: '600'
    }
  }
};

const meta: Meta<typeof TreasuryWithdrawalsAction> = {
  title: 'Sanchonet/Proposal Procedures/TreasuryWithdrawalsAction',
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
  data: {
    txDetails: {
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
      id: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0'
    }
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
