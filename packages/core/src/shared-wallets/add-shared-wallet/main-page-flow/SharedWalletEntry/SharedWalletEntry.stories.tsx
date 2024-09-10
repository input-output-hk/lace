import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletEntry } from './SharedWalletEntry';

const meta: Meta<typeof SharedWalletEntry> = {
  component: SharedWalletEntry,
  title: 'Shared Wallets / Components / SharedWalletGetStarted',
};

export default meta;
type Story = StoryObj<typeof SharedWalletEntry>;

export const NoKeys: Story = {
  args: {
    createAndImportOptionsDisabled: true,
    onCreateSharedWalletClick: action('create click'),
    onImportSharedWalletClick: action('import click'),
    onKeysGenerateClick: action('key generate'),
    sharedWalletKeyMode: 'generate',
  },
};

export const KeysAvailable: Story = {
  args: {
    createAndImportOptionsDisabled: false,
    onCreateSharedWalletClick: action('create click'),
    onImportSharedWalletClick: action('import click'),
    onKeysCopyClick: action('key copy'),
    onKeysGenerateClick: action('key generate'),
    sharedWalletKeyMode: 'copy',
  },
};
