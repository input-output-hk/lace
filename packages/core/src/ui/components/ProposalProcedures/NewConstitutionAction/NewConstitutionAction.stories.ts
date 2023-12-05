import type { Meta, StoryObj } from '@storybook/react';

import { NewConstitutionAction } from './NewConstitutionAction';
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

const meta: Meta<typeof NewConstitutionAction> = {
  title: 'ProposalProcedure/NewConstitutionAction',
  component: NewConstitutionAction,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof NewConstitutionAction>;

const data: ComponentProps<typeof NewConstitutionAction> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  data: {
    txDetails: {
      txType: 'New Constitution',
      deposit: '2000',
      rewardAccount: 'stake1u89sasnfyjtmgk8ydqfv3fdl52f36x3djedfnzfc9rkgzrcss5vgr'
    },
    procedure: {
      anchor: {
        hash: '0000000000000000000000000000000000000000000000000000000000000000',
        url: 'https://www.someurl.io',
        txHashUrl: 'https://www.someurl.io/'
      }
    },
    actionId: {
      index: '0',
      txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
      txHashUrl:
        'https://cexplorer.io/address/addr1q9wlvfl74g9h8txw5v0lfew2gjsw9z56d5kj8mmv5d8tudcx9eh8zefr3cxuje02lu6tgy083xkl39rr5xkj483vvd6q8nlapq'
    },
    constitution: {
      anchor: {
        dataHash: '0000000000000000000000000000000000000000000000000000000000000000',
        url: 'https://www.someurl.io'
      },
      scriptHash: 'cb0ec2692497b458e46812c8a5bfa2931d1a2d965a99893828ec810f'
    },
    governanceAction: {
      id: 'd0b1f7be72731a97e9728e0f1c358d576fd28aa9f290d53ce1ef803a1a753ba8',
      index: '0'
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
    constitution: {
      title: 'Constitution Details',
      anchor: {
        dataHash: 'Anchor Data Hash',
        url: 'Anchor URL'
      },
      scriptHash: 'Script Hash'
    },
    governanceAction: {
      id: 'Governance Action ID',
      index: 'Action Index'
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
