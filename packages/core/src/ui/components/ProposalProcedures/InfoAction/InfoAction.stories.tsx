import type { Meta, StoryObj } from '@storybook/react';

import { InfoAction } from './InfoAction';
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

const meta: Meta<typeof InfoAction> = {
  title: 'Sanchonet/Proposal Procedures/InfoAction',
  component: InfoAction,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof InfoAction>;

const data: ComponentProps<typeof InfoAction> = {
  data: {
    txDetails: {},
    procedure: {
      anchor: {
        hash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
        url: 'https://www.someurl.io',
        txHashUrl: 'https://www.someurl.io'
      }
    }
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
