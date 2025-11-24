import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmDRepRegistration } from './ConfirmDRepRegistration';
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

const meta: Meta<typeof ConfirmDRepRegistration> = {
  title: 'Sanchonet/Certificates/ConfirmDRepRegistration',
  component: ConfirmDRepRegistration,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ConfirmDRepRegistration>;

const data: ComponentProps<typeof ConfirmDRepRegistration> = {
  metadata: {
    depositPaid: '0.35 ADA',
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
