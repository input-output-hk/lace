import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmDRepUpdate } from './ConfirmDRepUpdate';
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

const meta: Meta<typeof ConfirmDRepUpdate> = {
  title: 'Sanchonet/Certificates/ConfirmDRepUpdate',
  component: ConfirmDRepUpdate,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ConfirmDRepUpdate>;

const data: ComponentProps<typeof ConfirmDRepUpdate> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  translations: {
    labels: {
      drepId: 'DRep ID',
      hash: 'Hash',
      url: 'URL'
    },
    metadata: 'Metadata'
  },
  metadata: {
    drepId: '65ge6g54g5dd5',
    hash: '9bba8233cdd086f0325daba465d568a88970d42536f9e71e92a80d5922ded885',
    url: 'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const Empty: Story = {
  args: {
    ...data,
    metadata: {
      drepId: '65ge6g54g5dd5'
    }
  }
};

export const WithError: Story = {
  args: {
    ...data,
    errorMessage: 'Something went wrong'
  }
};
