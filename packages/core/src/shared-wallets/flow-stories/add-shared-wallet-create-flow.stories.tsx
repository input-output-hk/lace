import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  createCoSignerObject,
  ensureCorrectCoSignersDataShape,
} from '../add-shared-wallet/creation-flow/co-signers-data-structure';
import { QuorumRadioOption } from '../add-shared-wallet/creation-flow/Quorum';
import { makeInitialState } from '../add-shared-wallet/creation-flow/SharedWalletCreationStore';
import { CreationFlowState, SharedWalletCreationStep } from '../add-shared-wallet/creation-flow/state-and-types';
import { validateCoSigners } from '../add-shared-wallet/creation-flow/validateCoSigners';
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
  title: 'Shared Wallets / Flows / Add shared wallet - Creation',
};

export default meta;

type Story = StoryObj<typeof AddSharedWalletStorybookHelper>;

export const Setup: Story = {
  name: 'Setup',
  render: () => (
    <AddSharedWalletStorybookHelper
      activeWalletSharedKey={sharedWalletKey}
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
    name: 'Sophia',
    sharedWalletKey,
  },
  {
    id: 'cosigner2',
    name: 'Martha',
    sharedWalletKey,
  },
]);
const coSignersStateData: CreationFlowState = {
  activeWalletName: 'My Wallet',
  coSignerInputsDirty: coSignersData.map((signer) => ({ id: signer.id, name: true, sharedWalletKey: true })),
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
      createCoSignerObject(sharedWalletKey),
    ]);
    return (
      <AddSharedWalletStorybookHelper
        activeWalletSharedKey={sharedWalletKey}
        modalOpen
        initialFlow={AddSharedWalletFlowType.Creation}
        creationInitialState={{
          ...coSignersStateData,
          coSignerInputsDirty: coSigners.map((signer) => ({ id: signer.id, name: false, sharedWalletKey: false })),
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
        name: 'Initiator',
        sharedWalletKey,
      },
      {
        id: 'cosigner2',
        name: 'Sophia',
        sharedWalletKey,
      },
      {
        id: 'cosigner3',
        name: 'Martha',
        sharedWalletKey,
      },
    ]);
    return (
      <AddSharedWalletStorybookHelper
        activeWalletSharedKey={sharedWalletKey}
        modalOpen
        initialFlow={AddSharedWalletFlowType.Creation}
        creationInitialState={{
          ...coSignersStateData,
          coSignerInputsDirty: coSigners.map((signer) => ({
            id: signer.id,
            name: !!signer.name,
            sharedWalletKey: !!signer.sharedWalletKey,
          })),
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
        name: 'Sophia',
        sharedWalletKey: 'invalid sharedWalletKey',
      },
      {
        id: 'cosigner2',
        name: 'Sophia',
        sharedWalletKey: '',
      },
    ]);
    return (
      <AddSharedWalletStorybookHelper
        activeWalletSharedKey={sharedWalletKey}
        modalOpen
        initialFlow={AddSharedWalletFlowType.Creation}
        creationInitialState={{
          ...coSignersStateData,
          coSignerInputsDirty: coSigners.map((signer) => ({ id: signer.id, name: true, sharedWalletKey: true })),
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
      activeWalletSharedKey={sharedWalletKey}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Creation}
      creationInitialState={{
        ...coSignersStateData,
        step: SharedWalletCreationStep.CoSignersImportantInfo,
      }}
    />
  ),
};

const filteredCosigners = coSignersStateData.coSigners.filter((c) => c.sharedWalletKey && c.name);
export const Quorum: Story = {
  name: 'Quorum',
  render: () => (
    <AddSharedWalletStorybookHelper
      activeWalletSharedKey={sharedWalletKey}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Creation}
      creationInitialState={{
        ...coSignersStateData,
        coSignerInputsDirty: filteredCosigners.map((signer) => ({ id: signer.id, name: true, sharedWalletKey: true })),
        coSigners: filteredCosigners,
        quorumRules: {
          numberOfCosigner: 1,
          option: QuorumRadioOption.NOfK,
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
      activeWalletSharedKey={sharedWalletKey}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Creation}
      creationInitialState={{
        ...coSignersStateData,
        quorumRules: {
          numberOfCosigner: 1,
          option: QuorumRadioOption.NOfK,
        },
        step: SharedWalletCreationStep.ShareDetails,
      }}
    />
  ),
};
