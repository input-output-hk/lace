import type { Meta, StoryObj } from '@storybook/react';
import { StartOverDialog } from './StartOverDialog';
import { ComponentProps } from 'react';
import { ThemeColorScheme } from '@input-output-hk/lace-ui-toolkit';

const meta: Meta<typeof StartOverDialog> = {
  title: 'Shared Wallets/StartOverAgainDialog',
  component: StartOverDialog,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof StartOverDialog>;

const noop = (): void => void 0;

const data: ComponentProps<typeof StartOverDialog> = {
  open: true,
  translations: {
    title: 'Are you sure you want to cancel adding a shared wallet?',
    description: 'You’ll have to start over.',
    cancel: 'Go Back',
    confirm: 'Proceed'
  },
  events: {
    onCancel: noop,
    onConfirm: noop,
    onOpenChanged: noop
  }
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
