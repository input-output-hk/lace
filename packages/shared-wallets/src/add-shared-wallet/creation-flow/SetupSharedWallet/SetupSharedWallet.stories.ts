import { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SetupSharedWallet } from './SetupSharedWallet';

const meta: Meta<typeof SetupSharedWallet> = {
  component: SetupSharedWallet,
  parameters: {
    layout: 'centered',
  },
  title: 'Components /SetupSharedWallet',
};

export default meta;
type Story = StoryObj<typeof SetupSharedWallet>;

const noop = (): void => void 0;

const data: ComponentProps<typeof SetupSharedWallet> = {
  activeWalletAddress:
    'addr_test1qz9kum802qxqf72ztg77a83j9lx2xle37v0wy2qprauqdw7d2yfye8mcz8jh6k86d5t7zx2f4z5n4twk0acn956zulusujyj9k',
  activeWalletName: 'Wallet 1',
  onBack: noop,
  onNext: noop,
  onWalletNameChange: noop,
  walletName: 'Wallet 3',
};

export const Overview: Story = {
  args: {
    ...data,
  },
};

export const Disabled: Story = {
  args: {
    ...data,
    walletName: '',
  },
};
