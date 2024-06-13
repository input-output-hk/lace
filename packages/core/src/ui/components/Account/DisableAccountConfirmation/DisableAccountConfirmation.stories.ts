import type { Meta, StoryObj } from '@storybook/react';

import { DisableAccountConfirmation } from './DisableAccountConfirmation';
import { ComponentProps } from 'react';
import { ThemeColorScheme } from '@input-output-hk/lace-ui-toolkit';

const meta: Meta<typeof DisableAccountConfirmation> = {
  title: 'Accounts/DisableAccountConfirmation',
  component: DisableAccountConfirmation,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof DisableAccountConfirmation>;

const data: ComponentProps<typeof DisableAccountConfirmation> = {
  translations: {
    title: 'Hold up!',
    description: 'Are you sure you want to disable this account? You can re-enable it later',
    cancel: 'Cancel',
    confirm: 'Disable'
  },
  onConfirm: () => void 0,
  onCancel: () => void 0,
  open: true
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
