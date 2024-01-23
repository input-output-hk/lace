import type { Meta, StoryObj } from '@storybook/react';

import { FindYourSharedWallet } from './FindYourSharedWallet';
import { ComponentProps } from 'react';

const meta: Meta<typeof FindYourSharedWallet> = {
  title: 'Shared Wallets/Find Your Shared Wallet',
  component: FindYourSharedWallet,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof FindYourSharedWallet>;

const noop = (): void => void 0;

const data: ComponentProps<typeof FindYourSharedWallet> = {
  translations: {
    subtitle: 'Upload your JSON file or click sync to scan the network',
    title: "Let's find your shared wallet",
    backButton: 'Back',
    nextButton: 'Next',
    fileUpload: {
      label: [
        { text: 'Drag & drop or', highlight: false },
        { text: 'choose file', highlight: true },
        { text: 'to upload', highlight: false }
      ],
      supportedFormats: 'Supported formats: JSON',
      removeButtonLabel: 'Remove'
    },
    syncNetwork: {
      title: [
        {
          text: 'Sync network to find a shared wallet',
          highlight: false
        },
        { text: 'click here', highlight: true }
      ],
      description: 'This will take a few minutes'
    }
  },
  onBack: noop,
  onChange: noop,
  onNext: noop
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const WithFile: Story = {
  args: {
    ...data,
    file: new File([''], 'file.json', { type: 'application/json' })
  }
};
