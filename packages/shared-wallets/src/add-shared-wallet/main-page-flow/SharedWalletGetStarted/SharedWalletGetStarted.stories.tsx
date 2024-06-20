import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletGetStarted } from './SharedWalletGetStarted';

const meta: Meta<typeof SharedWalletGetStarted> = {
  component: SharedWalletGetStarted,
  title: 'Components / SharedWalletGetStarted',
};

export default meta;
type Story = StoryObj<typeof SharedWalletGetStarted>;

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
