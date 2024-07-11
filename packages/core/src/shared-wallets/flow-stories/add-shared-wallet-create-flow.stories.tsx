import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  createCoSignerObject,
  ensureCorrectCoSignersDataShape,
} from '../add-shared-wallet/creation-flow/co-signers-data-structure';
import { QuorumRadioOption } from '../add-shared-wallet/creation-flow/Quorum';
import { CreationFlowState, makeInitialState } from '../add-shared-wallet/creation-flow/SharedWalletCreationStore';
import { SharedWalletCreationStep } from '../add-shared-wallet/creation-flow/types';
import { validateCoSigners } from '../add-shared-wallet/creation-flow/validateCoSigners';
import { AddSharedWalletFlowType, AddSharedWalletStorybookHelper, sharedKeys } from './AddSharedWalletStorybookHelper';

const meta: Meta<typeof AddSharedWalletStorybookHelper> = {
  component: AddSharedWalletStorybookHelper,
  parameters: {
    chromatic: { disableSnapshot: true },
    decorators: {
      colorSchema: false,
    },
  },
  title: 'Shared Wallets / Flows / Add shared wallet - Creation',
};

export default meta;

type Story = StoryObj<typeof AddSharedWalletStorybookHelper>;

export const Setup: Story = {
  name: 'Setup',
  render: () => (
    <AddSharedWalletStorybookHelper
      activeWalletSharedKeys={sharedKeys}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Creation}
      creationInitialState={{
        ...makeInitialState('My Wallet'),
        walletName: 'Wallet 2',
      }}
    />
  ),
};
const coSignersData: CreationFlowState['coSigners'] = ensureCorrectCoSignersDataShape([
  {
    id: 'cosigner1',
    keys: sharedKeys,
    name: 'Sophia',
  },
  {
    id: 'cosigner2',
    keys: sharedKeys,
    name: 'Martha',
  },
]);
const coSignersStateData: CreationFlowState = {
  activeWalletName: 'My Wallet',
  coSignerInputsDirty: coSignersData.map((signer) => ({ id: signer.id, keys: true, name: true })),
  coSignerInputsErrors: [],
  coSigners: coSignersData,
  quorumRules: undefined,
  step: SharedWalletCreationStep.CoSigners,
  walletName: 'Wallet 2',
};

export const CoSigners: Story = {
  name: 'CoSigners',
  render: () => {
    const coSigners: CreationFlowState['coSigners'] = ensureCorrectCoSignersDataShape([
      createCoSignerObject(sharedKeys),
    ]);
    return (
      <AddSharedWalletStorybookHelper
        activeWalletSharedKeys={sharedKeys}
        modalOpen
        initialFlow={AddSharedWalletFlowType.Creation}
        creationInitialState={{
          ...coSignersStateData,
          coSignerInputsDirty: coSigners.map((signer) => ({ id: signer.id, keys: false, name: false })),
          coSigners,
        }}
      />
    );
  },
};

export const CoSignersUserPlus2: Story = {
  name: 'CoSigners - user + 2',
  render: () => {
    const coSigners: CreationFlowState['coSigners'] = ensureCorrectCoSignersDataShape([
      {
        id: 'cosigner1',
        keys: sharedKeys,
        name: 'Initiator',
      },
      {
        id: 'cosigner2',
        keys: sharedKeys,
        name: 'Sophia',
      },
      {
        id: 'cosigner3',
        keys: sharedKeys,
        name: 'Martha',
      },
    ]);
    return (
      <AddSharedWalletStorybookHelper
        activeWalletSharedKeys={sharedKeys}
        modalOpen
        initialFlow={AddSharedWalletFlowType.Creation}
        creationInitialState={{
          ...coSignersStateData,
          coSignerInputsDirty: coSigners.map((signer) => ({ id: signer.id, keys: !!signer.keys, name: !!signer.name })),
          coSigners,
        }}
      />
    );
  },
};

export const CoSignersWithErrors: Story = {
  name: 'CoSigners - with errors',
  render: () => {
    const coSigners: CreationFlowState['coSigners'] = ensureCorrectCoSignersDataShape([
      {
        id: 'cosigner1',
        keys: 'invalid keys',
        name: 'Sophia',
      },
      {
        id: 'cosigner2',
        keys: '',
        name: 'Sophia',
      },
    ]);
    return (
      <AddSharedWalletStorybookHelper
        activeWalletSharedKeys={sharedKeys}
        modalOpen
        initialFlow={AddSharedWalletFlowType.Creation}
        creationInitialState={{
          ...coSignersStateData,
          coSignerInputsDirty: coSigners.map((signer) => ({ id: signer.id, keys: true, name: true })),
          coSignerInputsErrors: validateCoSigners(coSigners),
          coSigners,
        }}
      />
    );
  },
};

export const CoSignersConfirmation: Story = {
  name: 'CoSigners - confirmation',
  render: () => (
    <AddSharedWalletStorybookHelper
      activeWalletSharedKeys={sharedKeys}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Creation}
      creationInitialState={{
        ...coSignersStateData,
        step: SharedWalletCreationStep.CoSignersImportantInfo,
      }}
    />
  ),
};

const filteredCosigners = coSignersStateData.coSigners.filter((c) => c.keys && c.name);
export const Quorum: Story = {
  name: 'Quorum',
  render: () => (
    <AddSharedWalletStorybookHelper
      activeWalletSharedKeys={sharedKeys}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Creation}
      creationInitialState={{
        ...coSignersStateData,
        coSignerInputsDirty: filteredCosigners.map((signer) => ({ id: signer.id, keys: true, name: true })),
        coSigners: filteredCosigners,
        quorumRules: {
          numberOfCosigner: 1,
          option: QuorumRadioOption.SomeAddress,
        },
        step: SharedWalletCreationStep.Quorum,
      }}
    />
  ),
};
export const ShareDetails: Story = {
  name: 'ShareDetails',
  render: () => (
    <AddSharedWalletStorybookHelper
      activeWalletSharedKeys={sharedKeys}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Creation}
      creationInitialState={{
        ...coSignersStateData,
        quorumRules: {
          numberOfCosigner: 1,
          option: QuorumRadioOption.SomeAddress,
        },
        step: SharedWalletCreationStep.ShareDetails,
      }}
    />
  ),
};
