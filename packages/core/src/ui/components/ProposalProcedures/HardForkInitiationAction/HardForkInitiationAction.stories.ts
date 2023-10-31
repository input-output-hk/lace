import type { Meta, StoryObj } from '@storybook/react';

import { HardForkInitiationAction } from './HardForkInitiationAction';
import { ComponentProps } from 'react';

const meta: Meta<typeof HardForkInitiationAction> = {
  title: 'ProposalProcedure/HardForkInitiationAction',
  component: HardForkInitiationAction,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof HardForkInitiationAction>;

const data: ComponentProps<typeof HardForkInitiationAction> = {
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
    actionId: {
      index: 0,
      txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
      txHashUrl:
        'https://cexplorer.io/address/addr1q9wlvfl74g9h8txw5v0lfew2gjsw9z56d5kj8mmv5d8tudcx9eh8zefr3cxuje02lu6tgy083xkl39rr5xkj483vvd6q8nlapq'
    },
    protocolVersion: {
      major: 5,
      minor: 1,
      patch: 1
    }
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
    actionId: {
      title: 'Action ID',
      index: 'Index',
      txHash: 'TX Hash'
    },
    protocolVersion: {
      title: 'Hard Fork Details',
      label: 'Protocol Version'
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
