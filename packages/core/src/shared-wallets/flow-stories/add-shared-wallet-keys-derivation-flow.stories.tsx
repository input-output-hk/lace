import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { GenerateSharedWalletKeyFn } from '../add-shared-wallet';
import {
  GenerateSharedWalletKeyStep,
  stateCopyKey,
  stateEnterPassword,
} from '../add-shared-wallet/generate-key-flow/Store/state';
import {
  AddSharedWalletFlowType,
  AddSharedWalletStorybookHelper,
  sharedWalletKey,
} from './AddSharedWalletStorybookHelper';

const meta: Meta<typeof AddSharedWalletStorybookHelper> = {
  component: AddSharedWalletStorybookHelper,
  parameters: {
    chromatic: { disableSnapshot: true },
    decorators: {
      colorSchema: false,
    },
  },
  title: 'Shared Wallets / Flows / Add shared wallet - Keys derivation',
};

export default meta;

type Story = StoryObj<typeof AddSharedWalletStorybookHelper>;

export const EnterPassword: Story = {
  name: 'EnterPassword',
  render: () => <AddSharedWalletStorybookHelper modalOpen initialFlow={AddSharedWalletFlowType.KeyDerivation} />,
};

const failingGenerateKey: GenerateSharedWalletKeyFn = () => {
  const oneSecond = 1000;
  // eslint-disable-next-line promise/param-names
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Some unexpected error')), oneSecond));
};
export const EnterPasswordFailing: Story = {
  name: 'EnterPassword - failing key generation',
  render: () => (
    <AddSharedWalletStorybookHelper
      modalOpen
      initialFlow={AddSharedWalletFlowType.KeyDerivation}
      generateKey={failingGenerateKey}
      keyGenerationInitialState={stateEnterPassword({
        loading: false,
        passwordErrorType: undefined,
        sharedWalletKey: undefined,
        step: GenerateSharedWalletKeyStep.EnterPassword,
      })}
    />
  ),
};

export const EnterIncorrectPassword: Story = {
  name: 'EnterPassword - error message',
  render: () => (
    <AddSharedWalletStorybookHelper
      modalOpen
      initialFlow={AddSharedWalletFlowType.KeyDerivation}
      keyGenerationInitialState={stateEnterPassword({
        loading: false,
        passwordErrorType: 'invalid-password',
        sharedWalletKey: undefined,
        step: GenerateSharedWalletKeyStep.EnterPassword,
      })}
    />
  ),
};

export const CopyKeys: Story = {
  name: 'CopyKeys',
  render: () => (
    <AddSharedWalletStorybookHelper
      modalOpen
      initialFlow={AddSharedWalletFlowType.KeyDerivation}
      keyGenerationInitialState={stateCopyKey({
        loading: undefined,
        passwordErrorType: undefined,
        sharedWalletKey,
        step: GenerateSharedWalletKeyStep.CopyKey,
      })}
    />
  ),
};
