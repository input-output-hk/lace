import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletEntry } from '@src/shared-wallets';

const meta: Meta<typeof SharedWalletEntry> = {
  component: SharedWalletEntry,
  title: 'Shared Wallets / Components / SharedWalletGetStarted',
};

export default meta;
type Story = StoryObj<typeof SharedWalletEntry>;

export const NoKeys: Story = {
  args: {
    createAndImportOptionsDisabled: true,
    keysMode: 'generate',
    onCreateSharedWalletClick: action('create click'),
    onImportSharedWalletClick: action('import click'),
    onKeysCopyClick: action('keys copy'),
    onKeysGenerateClick: action('keys generate'),
  },
};

export const KeysAvailable: Story = {
  args: {
    createAndImportOptionsDisabled: false,
    keysMode: 'copy',
    onCreateSharedWalletClick: action('create click'),
    onImportSharedWalletClick: action('import click'),
    onKeysCopyClick: action('keys copy'),
    onKeysGenerateClick: action('keys generate'),
  },
};
