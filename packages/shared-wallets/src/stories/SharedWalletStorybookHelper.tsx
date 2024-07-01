import { VFC, useEffect, useState } from 'react';
import { AddSharedWalletModal, SharedWalletCreationFlow, SharedWalletEntry } from '../add-shared-wallet';
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
export const SharedWalletStorybookHelper: VFC<AddSharedWalletFlowProps> = ({
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
            <SharedWalletEntry
              onCreateSharedWalletClick={() => setFlow(AddSharedWalletFlowType.Creation)}
              onImportSharedWalletClick={() => void 0}
              getSharedKeys={() => Promise.resolve('test keys')}
              createAndImportOptionsDisabled
            />
          )}
          {flow === AddSharedWalletFlowType.Creation && (
            <SharedWalletCreationFlowInitialStateProvider value={initialState}>
              <SharedWalletCreationFlow
                activeWalletName={activeWalletName}
                initialWalletName="Wallet 2"
                navigateToAppHome={() => setOpen(false)}
                navigateToParentFlow={() => setFlow(AddSharedWalletFlowType.GetStarted)}
                generateSharedKeys={() => Promise.resolve('pass123')}
              />
            </SharedWalletCreationFlowInitialStateProvider>
          )}
        </AddSharedWalletModal>
      )}
    </>
  );
};
