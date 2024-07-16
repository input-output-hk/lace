import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  GenerateSharedKeysStep,
  stateCopyKeys,
  stateEnterPassword,
} from '../add-shared-wallet/generate-keys-flow/Store/state';
import { AddSharedWalletFlowType, AddSharedWalletStorybookHelper, sharedKeys } from './AddSharedWalletStorybookHelper';

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
  render: () => <AddSharedWalletStorybookHelper modalOpen initialFlow={AddSharedWalletFlowType.KeysDerivation} />,
};

export const EnterIncorrectPassword: Story = {
  name: 'EnterPassword - error message',
  render: () => (
    <AddSharedWalletStorybookHelper
      modalOpen
      initialFlow={AddSharedWalletFlowType.KeysDerivation}
      keysGenerationInitialState={stateEnterPassword({
        loading: false,
        passwordErrorMessage: 'Incorrect password',
        sharedKeys: undefined,
        sharedKeysCollapsed: undefined,
        step: GenerateSharedKeysStep.EnterPassword,
      })}
    />
  ),
};

export const CopyKeys: Story = {
  name: 'CopyKeys',
  render: () => (
    <AddSharedWalletStorybookHelper
      modalOpen
      initialFlow={AddSharedWalletFlowType.KeysDerivation}
      keysGenerationInitialState={stateCopyKeys({
        loading: undefined,
        passwordErrorMessage: undefined,
        sharedKeys,
        sharedKeysCollapsed: true,
        step: GenerateSharedKeysStep.CopyKeys,
      })}
    />
  ),
};
