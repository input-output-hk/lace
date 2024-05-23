import type { Meta, StoryObj } from '@storybook/react';

import { SetupSharedWallet } from './SetupSharedWallet';
import { ComponentProps } from 'react';

const meta: Meta<typeof SetupSharedWallet> = {
  title: 'Shared Wallets/SetupSharedWallet',
  component: SetupSharedWallet,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof SetupSharedWallet>;

const noop = (): void => void 0;

const data: ComponentProps<typeof SetupSharedWallet> = {
  activeWalletName: 'Wallet 1',
  activeWalletAddress:
    'addr_test1qz9kum802qxqf72ztg77a83j9lx2xle37v0wy2qprauqdw7d2yfye8mcz8jh6k86d5t7zx2f4z5n4twk0acn956zulusujyj9k',
  onBack: noop,
  onNext: noop,
  onNameChange: noop
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const Disabled: Story = {
  args: {
    ...data,
    data: {
      name: '',
      isNextEnabled: false
    }
  }
};
