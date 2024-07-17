import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
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

export const EnterIncorrectPassword: Story = {
  name: 'EnterPassword - error message',
  render: () => (
    <AddSharedWalletStorybookHelper
      modalOpen
      initialFlow={AddSharedWalletFlowType.KeyDerivation}
      keyGenerationInitialState={stateEnterPassword({
        loading: false,
        passwordErrorMessage: 'Incorrect password',
        sharedWalletKey: undefined,
        sharedWalletKeyCollapsed: undefined,
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
        passwordErrorMessage: undefined,
        sharedWalletKey,
        sharedWalletKeyCollapsed: true,
        step: GenerateSharedWalletKeyStep.CopyKey,
      })}
    />
  ),
};
