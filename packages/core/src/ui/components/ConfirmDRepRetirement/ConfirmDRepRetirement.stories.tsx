import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmDRepRetirement } from './ConfirmDRepRetirement';
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

const meta: Meta<typeof ConfirmDRepRetirement> = {
  title: 'Sanchonet/Certificates/ConfirmDRepRetirement',
  component: ConfirmDRepRetirement,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ConfirmDRepRetirement>;

const data: ComponentProps<typeof ConfirmDRepRetirement> = {
  metadata: {
    depositReturned: '0.35 ADA',
    drepId: '65ge6g54g5dd5'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
