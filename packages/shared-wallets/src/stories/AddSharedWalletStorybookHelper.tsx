import { VFC, useState } from 'react';
import { AddSharedWalletModal, SharedWalletCreationFlow, SharedWalletGetStarted } from '../add-shared-wallet';
import { CreationFlowState, makeInitialState } from '../add-shared-wallet/creation-flow/SharedWalletCreationStore';

export enum AddSharedWalletFlowType {
  Creation = 'Creation',
  GetStarted = 'GetStarted',
}

type AddSharedWalletFlowProps = {
  creationInitialState?: CreationFlowState;
  initialFlow?: AddSharedWalletFlowType;
  modalOpen?: boolean;
};

const activeWalletName = 'My wallet';
export const AddSharedWalletStorybookHelper: VFC<AddSharedWalletFlowProps> = ({
  modalOpen = false,
  initialFlow = AddSharedWalletFlowType.GetStarted,
  creationInitialState = makeInitialState(activeWalletName),
}) => {
  const [open, setOpen] = useState(modalOpen);
  const [flow, setFlow] = useState(initialFlow);
  return (
    <>
      <button onClick={() => setOpen(true)}>Add shared wallet</button>
      {open && (
        <AddSharedWalletModal onClose={() => setOpen(false)}>
          {flow === AddSharedWalletFlowType.GetStarted && (
            <SharedWalletGetStarted onCreateSharedWalletClick={() => setFlow(AddSharedWalletFlowType.Creation)} />
          )}
          {flow === AddSharedWalletFlowType.Creation && (
            <SharedWalletCreationFlow
              initialState={creationInitialState}
              navigateToAppHome={() => setOpen(false)}
              navigateToParentFlow={() => setFlow(AddSharedWalletFlowType.GetStarted)}
            />
          )}
        </AddSharedWalletModal>
      )}
    </>
  );
};
