import type { Meta, StoryObj } from '@storybook/react';
import { StartOverDialog } from './StartOverDialog';

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

export const Overview: Story = {
  args: {
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
  }
};
