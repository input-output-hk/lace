import type { Meta, StoryObj } from '@storybook/react';

import { NewConstitutionAction } from './NewConstitutionAction';
import { ComponentProps } from 'react';

const meta: Meta<typeof NewConstitutionAction> = {
  title: 'ProposalProcedure/NewConstitutionAction',
  component: NewConstitutionAction,
  parameters: {
    layout: 'centered'
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
    procedure: {
      deposit: '2000',
      rewardAccount: 'stake1u89sasnfyjtmgk8ydqfv3fdl52f36x3djedfnzfc9rkgzrcss5vgr',
      anchor: {
        hash: '0000000000000000000000000000000000000000000000000000000000000000',
        url: 'https://www.someurl.io',
        txHashUrl: 'https://www.someurl.io/'
      }
    },
    actionId: {
      index: 0,
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
    constitution: {
      title: 'Constitution Details',
      anchor: {
        dataHash: 'Anchor Data Hash',
        url: 'Anchor URL'
      },
      scriptHash: 'Script Hash'
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
