import type { Meta, StoryObj } from '@storybook/react';

import { UpdateCommitteeAction } from './UpdateCommitteeActionAction';
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

const meta: Meta<typeof UpdateCommitteeAction> = {
  title: 'Sanchonet/Proposal Procedures/UpdateCommitteeAction',
  component: UpdateCommitteeAction,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof UpdateCommitteeAction>;

const data: ComponentProps<typeof UpdateCommitteeAction> = {
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
    actionId: {
      index: '0',
      id: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0'
    },
    membersToBeAdded: [
      {
        coldCredential: {
          hash: '30000000000000000000000000000000000000000000000000000000'
        },
        epoch: '1'
      },
      {
        coldCredential: {
          hash: '40000000000000000000000000000000000000000000000000000000'
        },
        epoch: '2'
      }
    ],
    membersToBeRemoved: [
      {
        hash: '00000000000000000000000000000000000000000000000000000000'
      },
      {
        hash: '20000000000000000000000000000000000000000000000000000000'
      }
    ],
    newQuorumThreshold: {
      denominator: '5',
      numerator: '1'
    }
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
