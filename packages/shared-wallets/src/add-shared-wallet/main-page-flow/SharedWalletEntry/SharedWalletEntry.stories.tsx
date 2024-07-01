import { action } from '@storybook/addon-actions';
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SharedWalletEntry } from './SharedWalletEntry';

const meta: Meta<typeof SharedWalletEntry> = {
  component: SharedWalletEntry,
  title: 'Components / SharedWalletGetStarted',
};

export default meta;
type Story = StoryObj<typeof SharedWalletEntry>;

const generateSharedKeysMock = async (): Promise<string> => {
  action('keys generate')();
  return Promise.resolve('mocked-key');
};

export const NoKeys: Story = {
  args: {
    createAndImportOptionsDisabled: true,
    getSharedKeys: generateSharedKeysMock,
    onCreateSharedWalletClick: action('create click'),
    onImportSharedWalletClick: action('import click'),
  },
};

export const KeysAvailable: Story = {
  args: {
    createAndImportOptionsDisabled: true,
    onCreateSharedWalletClick: action('create click'),
    onImportSharedWalletClick: action('import click'),
  },
};
