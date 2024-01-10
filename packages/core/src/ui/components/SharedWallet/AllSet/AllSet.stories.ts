import type { Meta, StoryObj } from '@storybook/react';

import { AllSet } from './AllSet';
import { ComponentProps } from 'react';

const meta: Meta<typeof AllSet> = {
  title: 'Shared Wallets/AllSet',
  component: AllSet,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof AllSet>;

const data: ComponentProps<typeof AllSet> = {
  translations: {
    subtitle: 'Dive into our range of articles to discover the exciting possibilities with your new shared wallet.',
    title: "Hooray! You're All Set",
    educational: {
      advancedFeatures: {
        title: 'Advanced Features of Your\nShared Wallet',
        subtitle: 'Learn'
      },
      multiSig: {
        title: 'The Basics of Multi-Sig\nWallets',
        subtitle: 'Learn'
      },
      tips: {
        subtitle: 'Tips',
        title: 'Tips for Smart Wallet\nManagement'
      }
    },
    goToSharedWallet: 'Go to my shared wallet'
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
