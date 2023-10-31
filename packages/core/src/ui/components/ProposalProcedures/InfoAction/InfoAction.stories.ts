import type { Meta, StoryObj } from '@storybook/react';

import { InfoAction } from './InfoAction';
import { ComponentProps } from 'react';

const meta: Meta<typeof InfoAction> = {
  title: 'ProposalProcedure/InfoAction',
  component: InfoAction,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof InfoAction>;

const data: ComponentProps<typeof InfoAction> = {
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
