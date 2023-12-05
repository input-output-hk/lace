import type { Meta, StoryObj } from '@storybook/react';

import { HardForkInitiationAction } from './HardForkInitiationAction';
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

const meta: Meta<typeof HardForkInitiationAction> = {
  title: 'ProposalProcedure/HardForkInitiationAction',
  component: HardForkInitiationAction,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
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
    txDetails: {
      txType: 'Hard Fork Initiation',
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
    governanceAction: {
      id: 'd0b1f7be72731a97e9728e0f1c358d576fd28aa9f290d53ce1ef803a1a753ba8',
      index: '0'
    },
    actionId: {
      index: '0',
      txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
      txHashUrl:
        'https://cexplorer.io/address/addr1q9wlvfl74g9h8txw5v0lfew2gjsw9z56d5kj8mmv5d8tudcx9eh8zefr3cxuje02lu6tgy083xkl39rr5xkj483vvd6q8nlapq'
    },
    protocolVersion: {
      major: '5',
      minor: '1',
      patch: '1'
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
    governanceAction: {
      id: 'Governance Action ID',
      index: 'Action Index'
    },
    protocolVersion: {
      major: 'Protocol Version Major',
      minor: 'Protocol Version Minor',
      patch: 'Protocol Version Patch'
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
