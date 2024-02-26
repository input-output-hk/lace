import React, { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ReactComponent as LacePortal } from '../../../assets/images/lace-portal-01.svg';
import { EnableAccountConfirmWithHW, EnableAccountConfirmWithHWState } from './EnableAccountConfirmWithHW';

const meta: Meta<typeof EnableAccountConfirmWithHW> = {
  title: 'Accounts/EnableAccountConfirmWithHW',
  component: EnableAccountConfirmWithHW,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof EnableAccountConfirmWithHW>;

const data: ComponentProps<typeof EnableAccountConfirmWithHW> = {
  open: true,
  state: EnableAccountConfirmWithHWState.ReadyToConfirm,
  onConfirm: () => void 0,
  onCancel: () => void 0,
  isPopup: false,
  backgroundImage: <LacePortal />,
  translations: {
    title: 'Confirm transaction with Ledger',
    description:
      'Connect your Ledger device directly to your computer. Unlock the device and open the Cardano app. Then click confirm.',
    cancel: 'Cancel',
    confirm: 'Confirm',
    signing: 'Signing in progress'
  }
};

export const ReadyToConfirm: Story = {
  args: {
    ...data,
    state: EnableAccountConfirmWithHWState.ReadyToConfirm
  }
};

export const Signing: Story = {
  args: {
    ...data,
    state: EnableAccountConfirmWithHWState.Signing
  }
};
