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
        title: 'Advanced Features of Your Shared Wallet',
        subtitle: 'Learn'
      },
      multiSig: {
        title: 'The Basics of Multi-Sig Wallets',
        subtitle: 'Learn'
      },
      tips: {
        subtitle: 'Tips',
        title: 'Tips for Smart Wallet Management'
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
