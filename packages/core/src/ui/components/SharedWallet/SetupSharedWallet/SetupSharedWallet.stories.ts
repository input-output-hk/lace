import type { Meta, StoryObj } from '@storybook/react';

import { SetupSharedWallet } from './SetupSharedWallet';
import { ComponentProps } from 'react';

const meta: Meta<typeof SetupSharedWallet> = {
  title: 'SetupSharedWallet',
  component: SetupSharedWallet,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof SetupSharedWallet>;

const noop = (): void => void 0;

const data: ComponentProps<typeof SetupSharedWallet> = {
  translations: {
    backButton: 'Back',
    nextButton: 'Next',
    subtitle: 'Choose a name to identify your new shared wallet and the select the wallet you want it linked to.',
    textBoxLabel: 'Shared wallet name',
    title: "Let's set up your shared wallet"
  },
  data: {
    name: 'My Shared Wallet',
    isNextEnabled: true
  },
  events: {
    onBack: noop,
    onNext: noop,
    onNameChange: noop
  }
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
