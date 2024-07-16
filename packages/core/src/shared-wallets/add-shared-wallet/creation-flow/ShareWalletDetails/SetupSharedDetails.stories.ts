import { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QuorumRadioOption } from '../Quorum'; // Adjust the import path as necessary
import { CreationFlowState, SharedWalletCreationStep } from '../state-and-types';
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

const mockStateShareDetails: CreationFlowState = {
  activeWalletName: 'My active wallet',
  coSignerInputsDirty: [],
  coSignerInputsErrors: [],
  coSigners: [
    {
      id: '1',
      keys: '3a2b5f9e8d2a3b4e5f6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8g',
      name: 'Alice',
    },
    {
      id: '2',
      keys: '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f',
      name: 'Bob',
    },
  ],
  quorumRules: {
    numberOfCosigner: 2,
    option: QuorumRadioOption.NOfK,
  },
  step: SharedWalletCreationStep.ShareDetails,
  walletName: 'MySharedWallet',
};

const data: ComponentProps<typeof ShareWalletDetails> = {
  onBack: noop,
  stateSharedWallet: mockStateShareDetails,
};

export const Overview: Story = {
  args: {
    ...data,
  },
};

export const Disabled: Story = {
  args: {
    ...data,
  },
};
