import { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ShareWalletDetails } from './ShareWalletDetails';

const meta: Meta<typeof ShareWalletDetails> = {
  component: ShareWalletDetails,
  parameters: {
    layout: 'centered',
  },
  title: 'Shared Wallets / Components / ShareWalletDetails',
};

export default meta;
type Story = StoryObj<typeof ShareWalletDetails>;

const noop = (): void => void 0;

const data: ComponentProps<typeof ShareWalletDetails> = {
  onBack: noop,
  onDownload: noop,
  onNext: noop,
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
