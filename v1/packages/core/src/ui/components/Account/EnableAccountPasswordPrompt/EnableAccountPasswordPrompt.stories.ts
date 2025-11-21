import type { Meta, StoryObj } from '@storybook/react';

import { EnableAccountPasswordPrompt } from './EnableAccountPasswordPrompt';
import { ComponentProps } from 'react';
import { ThemeColorScheme } from '@input-output-hk/lace-ui-toolkit';

const meta: Meta<typeof EnableAccountPasswordPrompt> = {
  title: 'Accounts/EnableAccountPasswordPrompt',
  component: EnableAccountPasswordPrompt,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof EnableAccountPasswordPrompt>;

const data: ComponentProps<typeof EnableAccountPasswordPrompt> = {
  translations: {
    title: 'Enable account',
    headline: 'Confirm action',
    description: 'Enter password to confirm this action.',
    passwordPlaceholder: 'Password',
    wrongPassword: 'Wrong password',
    cancel: 'Cancel',
    confirm: 'Confirm'
  },
  isPasswordIncorrect: false,
  onConfirm: () => void 0,
  onCancel: () => void 0,
  open: true,
  isPopup: false
};

export const Overview: Story = {
  args: {
    ...data
  },
  parameters: {
    decorators: {
      colorSchema: false
    }
  }
};

export const PopUp: Story = {
  args: {
    ...data,
    isPopup: true
  },
  parameters: {
    decorators: {
      colorSchema: false
    }
  }
};

export const IncorrectPassword: Story = {
  args: {
    ...data,
    isPasswordIncorrect: true
  },
  parameters: {
    decorators: {
      colorSchema: false
    }
  }
};

export const WithDarkMode: Story = {
  args: {
    ...data
  },
  parameters: {
    decorators: {
      colorSchema: false,
      theme: ThemeColorScheme.Dark
    }
  }
};
