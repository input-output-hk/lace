import React, { VFC, useEffect, useState } from 'react';
import { AddSharedWalletMainPageFlow, AddSharedWalletModal, SharedWalletCreationFlow } from '../add-shared-wallet';
import {
  CreationFlowState,
  SharedWalletCreationFlowInitialStateProvider,
  makeInitialState as makeSharedWalletCreationInitialState,
} from '../add-shared-wallet/creation-flow/SharedWalletCreationStore';
import { GenerateSharedKeysFlow } from '../add-shared-wallet/generate-keys-flow';
import { LinkedWalletType } from '../add-shared-wallet/generate-keys-flow/GenerateSharedKeysFlow';
import { GenerateSharedKeysState } from '../add-shared-wallet/generate-keys-flow/Store';
import {
  GenerateSharedKeysInitialStateProvider,
  makeInitialState as makeGenerateSharedKeysInitialState,
} from '../add-shared-wallet/generate-keys-flow/Store/Store';

export enum AddSharedWalletFlowType {
  Creation = 'Creation',
  GetStarted = 'GetStarted',
  KeysDerivation = 'KeysDerivation',
}

type AddSharedWalletFlowProps = {
  activeWalletSharedKeys?: string;
  activeWalletType?: LinkedWalletType;
  creationInitialState?: CreationFlowState;
  generateKeys?: (password: string) => Promise<string>;
  initialFlow?: AddSharedWalletFlowType;
  keysGenerationInitialState?: GenerateSharedKeysState;
  modalOpen?: boolean;
};

export const sharedKeys = 'addr_shared_vksdhgfsft578s6tf68tdsf,stake_shared_vkgyufieus65cuv76s5vrs7';

export const activeWalletName = 'My wallet';

export const AddSharedWalletStorybookHelper: VFC<AddSharedWalletFlowProps> = ({
  activeWalletSharedKeys,
  activeWalletType = 'InMemory',
  modalOpen = false,
  initialFlow = AddSharedWalletFlowType.GetStarted,
  creationInitialState: providedCreationInitialState = makeSharedWalletCreationInitialState(activeWalletName),
  keysGenerationInitialState: providedKeysGenerationInitialState = makeGenerateSharedKeysInitialState(),
  generateKeys = async () => sharedKeys,
}) => {
  const [open, setOpen] = useState(modalOpen);
  const [flow, setFlow] = useState(initialFlow);
  const [generatedKeys, setGeneratedKeys] = useState<string | undefined>(activeWalletSharedKeys);
  const [creationInitialState, setCreationInitialState] = useState<CreationFlowState | null>(
    providedCreationInitialState,
  );
  const [keysGenerationInitialState, setKeysGenerationInitialState] = useState<GenerateSharedKeysState | null>(
    providedKeysGenerationInitialState,
  );
  useEffect(() => {
    setCreationInitialState(null);
    setKeysGenerationInitialState(null);
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)}>Add shared wallet</button>
      {open && (
        <AddSharedWalletModal
          onClose={() => {
            setOpen(false);
            setFlow(AddSharedWalletFlowType.GetStarted);
          }}
        >
          {flow === AddSharedWalletFlowType.GetStarted && (
            <AddSharedWalletMainPageFlow
              onCreateSharedWalletClick={() => setFlow(AddSharedWalletFlowType.Creation)}
              onImportSharedWalletClick={() => void 0}
              onKeysGenerateClick={() => setFlow(AddSharedWalletFlowType.KeysDerivation)}
              sharedKeys={generatedKeys}
            />
          )}
          {flow === AddSharedWalletFlowType.KeysDerivation && (
            <GenerateSharedKeysInitialStateProvider value={keysGenerationInitialState}>
              <GenerateSharedKeysFlow
                generateKeys={generateKeys}
                navigateToParentFlow={() => {
                  setGeneratedKeys(sharedKeys);
                  setFlow(AddSharedWalletFlowType.GetStarted);
                }}
                activeWalletName={activeWalletName}
                activeWalletType={activeWalletType}
              />
            </GenerateSharedKeysInitialStateProvider>
          )}
          {flow === AddSharedWalletFlowType.Creation && (
            <SharedWalletCreationFlowInitialStateProvider value={creationInitialState}>
              <SharedWalletCreationFlow
                activeWalletName={activeWalletName}
                initialWalletName="Wallet 2"
                navigateToAppHome={() => {
                  setOpen(false);
                  setFlow(AddSharedWalletFlowType.GetStarted);
                }}
                navigateToParentFlow={() => setFlow(AddSharedWalletFlowType.GetStarted)}
              />
            </SharedWalletCreationFlowInitialStateProvider>
          )}
        </AddSharedWalletModal>
      )}
    </>
  );
};
