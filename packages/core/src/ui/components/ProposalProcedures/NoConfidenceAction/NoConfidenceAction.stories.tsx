import type { Meta, StoryObj } from '@storybook/react';

import { NoConfidenceAction } from './NoConfidenceAction';
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

const meta: Meta<typeof NoConfidenceAction> = {
  title: 'Sanchonet/Proposal Procedures/NoConfidenceAction',
  component: NoConfidenceAction,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof NoConfidenceAction>;

const data: ComponentProps<typeof NoConfidenceAction> = {
  data: {
    txDetails: {
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
      id: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0'
    }
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
