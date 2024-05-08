import type { Meta, StoryObj } from '@storybook/react';
import { NoSharedWalletFoundDialog } from './NoSharedWalletFoundDialog';
import { ThemeColorScheme } from '@lace/ui';
import { ComponentProps } from 'react';

const meta: Meta<typeof NoSharedWalletFoundDialog> = {
  title: 'Shared Wallets/NoSharedWalletFoundDialog',
  component: NoSharedWalletFoundDialog,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof NoSharedWalletFoundDialog>;

const noop = (): void => void 0;

const data: ComponentProps<typeof NoSharedWalletFoundDialog> = {
  open: true,
  translations: {
    title: 'No shared wallet found',
    description: 'Please try again',
    confirm: 'Proceed'
  },
  events: {
    handleOnConfirm: noop,
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
