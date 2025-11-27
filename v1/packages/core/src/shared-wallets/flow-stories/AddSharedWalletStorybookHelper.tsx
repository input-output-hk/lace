import { Wallet } from '@lace/cardano';
import React, { VFC, useEffect, useState } from 'react';
import {
  GenerateSharedWalletKeyFn,
  makeGenerateSharedWalletKey,
} from '@src/shared-wallets/add-shared-wallet/generate-key-flow/generate-shared-wallet-key';
import {
  AddSharedWalletMainPageFlow,
  AddSharedWalletModal,
  SharedWalletCreationFlow,
  SharedWalletRestorationFlow,
} from '../add-shared-wallet';
import {
  SharedWalletCreationFlowInitialStateProvider,
  makeInitialState as makeSharedWalletCreationInitialState,
} from '../add-shared-wallet/creation-flow/SharedWalletCreationStore';
import { CreationFlowState } from '../add-shared-wallet/creation-flow/state-and-types';
import { GenerateSharedWalletKeyFlow } from '../add-shared-wallet/generate-key-flow';
import { GenerateSharedWalletKeyState } from '../add-shared-wallet/generate-key-flow/Store';
import {
  GenerateSharedWalletKeyInitialStateProvider,
  makeInitialState as makeGenerateSharedWalletKeyInitialState,
} from '../add-shared-wallet/generate-key-flow/Store/Store';
import { LinkedWalletType } from '../types';

export enum AddSharedWalletFlowType {
  Creation = 'Creation',
  GetStarted = 'GetStarted',
  Import = 'Import',
  KeyDerivation = 'KeyDerivation',
}

type AddSharedWalletFlowProps = {
  activeWalletSharedKey?: string;
  activeWalletType?: LinkedWalletType;
  creationInitialState?: CreationFlowState;
  generateKey?: GenerateSharedWalletKeyFn;
  initialFlow?: AddSharedWalletFlowType;
  keyGenerationInitialState?: GenerateSharedWalletKeyState;
  modalOpen?: boolean;
};

export const sharedWalletKey =
  'acct_shared_xvk1q395kywke7mufrysg33nsm6ggjxswu4g8q8ag7ks9kdyaczchtemd5d2armrfstfa32lamhxfl3sskgcmxm4zdhtvut362796ez4ecqx6vnht';

const generateSharedWalletKey = makeGenerateSharedWalletKey({
  getSharedWalletExtendedPublicKey: async () => Wallet.Cardano.Cip1854ExtendedAccountPublicKey(sharedWalletKey),
});

export const activeWalletName = 'My wallet';

export const AddSharedWalletStorybookHelper: VFC<AddSharedWalletFlowProps> = ({
  activeWalletSharedKey,
  activeWalletType = 'InMemory',
  modalOpen = false,
  initialFlow = AddSharedWalletFlowType.GetStarted,
  creationInitialState: providedCreationInitialState = makeSharedWalletCreationInitialState(activeWalletName),
  keyGenerationInitialState: providedKeysGenerationInitialState = makeGenerateSharedWalletKeyInitialState(),
  generateKey = generateSharedWalletKey,
}) => {
  const [open, setOpen] = useState(modalOpen);
  const [flow, setFlow] = useState(initialFlow);
  const [generatedKeys, setGeneratedKeys] = useState<string | undefined>(activeWalletSharedKey);
  const [creationInitialState, setCreationInitialState] = useState<CreationFlowState | null>(
    providedCreationInitialState,
  );
  const [keyGenerationInitialState, setKeyGenerationInitialState] = useState<GenerateSharedWalletKeyState | null>(
    providedKeysGenerationInitialState,
  );
  useEffect(() => {
    setCreationInitialState(null);
    setKeyGenerationInitialState(null);
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
              onImportSharedWalletClick={() => setFlow(AddSharedWalletFlowType.Import)}
              onKeysGenerateClick={() => setFlow(AddSharedWalletFlowType.KeyDerivation)}
              sharedWalletKey={generatedKeys}
            />
          )}
          {flow === AddSharedWalletFlowType.KeyDerivation && (
            <GenerateSharedWalletKeyInitialStateProvider value={keyGenerationInitialState}>
              <GenerateSharedWalletKeyFlow
                generateKey={generateKey}
                navigateToParentFlow={() => {
                  setGeneratedKeys(sharedWalletKey);
                  setFlow(AddSharedWalletFlowType.GetStarted);
                }}
                activeWalletName={activeWalletName}
                activeWalletType={activeWalletType}
              />
            </GenerateSharedWalletKeyInitialStateProvider>
          )}
          {flow === AddSharedWalletFlowType.Creation && generatedKeys && (
            <SharedWalletCreationFlowInitialStateProvider value={creationInitialState}>
              <SharedWalletCreationFlow
                activeWalletName={activeWalletName}
                initialWalletName="Wallet 2"
                navigateToAppHome={() => {
                  setOpen(false);
                  setFlow(AddSharedWalletFlowType.GetStarted);
                }}
                exitTheFlow={() => setFlow(AddSharedWalletFlowType.GetStarted)}
                sharedWalletKey={generatedKeys}
                onCreateSharedWallet={async () => await void 0}
              />
            </SharedWalletCreationFlowInitialStateProvider>
          )}
          {flow === AddSharedWalletFlowType.Import && generatedKeys && (
            <SharedWalletRestorationFlow
              navigateToAppHome={() => {
                setOpen(false);
                setFlow(AddSharedWalletFlowType.GetStarted);
              }}
              exitTheFlow={() => setFlow(AddSharedWalletFlowType.GetStarted)}
              onRestoreSharedWallet={() => void 0}
              sharedKeys={generatedKeys}
            />
          )}
        </AddSharedWalletModal>
      )}
    </>
  );
};
