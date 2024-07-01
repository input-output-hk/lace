import { Meta, StoryObj } from '@storybook/react';
import { QuorumRadioOption } from '../add-shared-wallet/creation-flow/Quorum';
import {
  CreationFlowState,
  createEmptyCosignerObject,
  makeInitialState,
} from '../add-shared-wallet/creation-flow/SharedWalletCreationStore';
import { SharedWalletCreationStep } from '../add-shared-wallet/creation-flow/types';
import { validateCoSigners } from '../add-shared-wallet/creation-flow/validateCoSigners';
import { AddSharedWalletFlowType, SharedWalletStorybookHelper } from './SharedWalletStorybookHelper';

const meta: Meta<typeof SharedWalletStorybookHelper> = {
  component: SharedWalletStorybookHelper,
  title: 'Main / Add shared wallet - Creation',
};

export default meta;

type Story = StoryObj<typeof SharedWalletStorybookHelper>;

const sharedKeys = 'addr_shared_vksdhgfsft578s6tf68tdsf,stake_shared_vkgyufieus65cuv76s5vrs7';

export const Setup: Story = {
  name: 'Setup',
  render: () => (
    <SharedWalletStorybookHelper
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
const coSignersData: CreationFlowState['coSigners'] = [
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
];
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
    const coSigners: CreationFlowState['coSigners'] = [createEmptyCosignerObject(), createEmptyCosignerObject()];
    return (
      <SharedWalletStorybookHelper
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

export const CoSignersSingleEntry: Story = {
  name: 'CoSigners - single entry',
  render: () => {
    const coSigners: CreationFlowState['coSigners'] = [
      {
        id: 'cosigner',
        keys: sharedKeys,
        name: 'Bob',
      },
      createEmptyCosignerObject(),
    ];
    return (
      <SharedWalletStorybookHelper
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
    const coSigners: CreationFlowState['coSigners'] = [
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
    ];
    return (
      <SharedWalletStorybookHelper
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
    <SharedWalletStorybookHelper
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

export const Quorum: Story = {
  name: 'Quorum',
  render: () => (
    <SharedWalletStorybookHelper
      activeWalletSharedKeys={sharedKeys}
      modalOpen
      initialFlow={AddSharedWalletFlowType.Creation}
      creationInitialState={{
        ...coSignersStateData,
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
    <SharedWalletStorybookHelper
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
