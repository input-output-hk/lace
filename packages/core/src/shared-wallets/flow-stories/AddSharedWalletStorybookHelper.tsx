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
import { LinkedWalletType } from '../add-shared-wallet/generate-key-flow/GenerateSharedWalletKeyFlow';
import { GenerateSharedWalletKeyState } from '../add-shared-wallet/generate-key-flow/Store';
import {
  GenerateSharedWalletKeyInitialStateProvider,
  makeInitialState as makeGenerateSharedWalletKeyInitialState,
} from '../add-shared-wallet/generate-key-flow/Store/Store';

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
  '979693650bb44f26010e9f7b3b550b0602c748d1d00981747bac5c34cf5b945fe01a39317b9b701e58ee16b5ed16aa4444704b98cc997bdd6c5a9502a8b7d70d';

const generateSharedWalletKey = makeGenerateSharedWalletKey({
  getSharedWalletExtendedPublicKey: async () => Wallet.Crypto.Bip32PublicKeyHex(sharedWalletKey),
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
                onCreateSharedWallet={() => void 0}
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
