import type { Meta, StoryObj } from '@storybook/react';

import { NewConstitutionAction } from './NewConstitutionAction';
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

const meta: Meta<typeof NewConstitutionAction> = {
  title: 'Sanchonet/Proposal Procedures/NewConstitutionAction',
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
    },
    constitution: {
      anchor: {
        dataHash: '0000000000000000000000000000000000000000000000000000000000000000',
        url: 'https://www.someurl.io'
      },
      scriptHash: 'cb0ec2692497b458e46812c8a5bfa2931d1a2d965a99893828ec810f'
    }
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
