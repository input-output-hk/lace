import type { Meta, StoryObj } from '@storybook/react';

import { EnableAccountPasswordPrompt } from './EnableAccountPasswordPrompt';
import { ComponentProps } from 'react';

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
  wasPasswordIncorrect: false,
  onConfirm: () => void 0,
  onCancel: () => void 0,
  open: true,
  isPopup: false
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const PopUp: Story = {
  args: {
    ...data,
    isPopup: true
  }
};

export const IncorrectPassword: Story = {
  args: {
    ...data,
    wasPasswordIncorrect: true
  }
};
