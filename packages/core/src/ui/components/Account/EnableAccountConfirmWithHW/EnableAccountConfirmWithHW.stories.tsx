import { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { EnableAccountConfirmWithHW } from './EnableAccountConfirmWithHW';
import { ThemeColorScheme } from '@input-output-hk/lace-ui-toolkit';

const meta: Meta<typeof EnableAccountConfirmWithHW> = {
  title: 'Accounts/EnableAccountConfirmWithHW',
  component: EnableAccountConfirmWithHW,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof EnableAccountConfirmWithHW>;

const data: ComponentProps<typeof EnableAccountConfirmWithHW> = {
  open: true,
  state: 'waiting',
  onRetry: () => void 0,
  onCancel: () => void 0,
  isPopup: false,
  translations: {
    title: 'Enable account',
    headline: 'Confirm with Your Hardware Wallet',
    description: 'Connect and unlock your device. Then, follow instructions to confirm your action.',
    errorHeadline: 'Sorry! Something went wrong',
    errorDescription: 'Please ensure your device is properly connected and unlocked.',
    errorHelpLink: 'Having trouble?',
    buttons: {
      cancel: 'Cancel',
      waiting: 'Waiting for device',
      signing: 'Signing in progress',
      error: 'Try again'
    }
  }
};

export const Waiting: Story = {
  args: data,
  parameters: {
    decorators: {
      colorSchema: false
    }
  }
};

export const Signing: Story = {
  args: {
    ...data,
    state: 'signing'
  },
  parameters: {
    decorators: {
      colorSchema: false
    }
  }
};

export const ErrorCase: Story = {
  args: {
    ...data,
    state: 'error'
  },
  parameters: {
    decorators: {
      colorSchema: false
    }
  }
};

export const WithDarkMode: Story = {
  args: data,
  parameters: {
    decorators: {
      colorSchema: false,
      theme: ThemeColorScheme.Dark
    }
  }
};
