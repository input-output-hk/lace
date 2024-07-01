import { VFC, useEffect, useState } from 'react';
import { AddSharedWalletMainPageFlow, AddSharedWalletModal, SharedWalletCreationFlow } from '../add-shared-wallet';
import {
  CreationFlowState,
  SharedWalletCreationFlowInitialStateProvider,
  makeInitialState,
} from '../add-shared-wallet/creation-flow/SharedWalletCreationStore';

export enum AddSharedWalletFlowType {
  Creation = 'Creation',
  GetStarted = 'GetStarted',
}

type AddSharedWalletFlowProps = {
  activeWalletSharedKeys?: string;
  creationInitialState?: CreationFlowState;
  initialFlow?: AddSharedWalletFlowType;
  modalOpen?: boolean;
};

const activeWalletName = 'My wallet';
export const AddSharedWalletStorybookHelper: VFC<AddSharedWalletFlowProps> = ({
  activeWalletSharedKeys,
  modalOpen = false,
  initialFlow = AddSharedWalletFlowType.GetStarted,
  creationInitialState = makeInitialState(activeWalletName),
}) => {
  const [open, setOpen] = useState(modalOpen);
  const [flow, setFlow] = useState(initialFlow);
  const [initialState, setInitialState] = useState<CreationFlowState | null>(creationInitialState);
  useEffect(() => {
    setInitialState(null);
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)}>Add shared wallet</button>
      {open && (
        <AddSharedWalletModal onClose={() => setOpen(false)}>
          {flow === AddSharedWalletFlowType.GetStarted && (
            <AddSharedWalletMainPageFlow
              onCreateSharedWalletClick={() => setFlow(AddSharedWalletFlowType.Creation)}
              onImportSharedWalletClick={() => void 0}
              onKeysGenerateClick={() => void 0}
              sharedKeys={activeWalletSharedKeys}
            />
          )}
          {flow === AddSharedWalletFlowType.Creation && (
            <SharedWalletCreationFlowInitialStateProvider value={initialState}>
              <SharedWalletCreationFlow
                activeWalletName={activeWalletName}
                initialWalletName="Wallet 2"
                navigateToAppHome={() => setOpen(false)}
                navigateToStart={() => setFlow(AddSharedWalletFlowType.GetStarted)}
              />
            </SharedWalletCreationFlowInitialStateProvider>
          )}
        </AddSharedWalletModal>
      )}
    </>
  );
};
