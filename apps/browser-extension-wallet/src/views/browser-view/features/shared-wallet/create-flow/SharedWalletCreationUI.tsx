import { SetupSharedWallet } from '@lace/core';
import React, { VFC } from 'react';
import { useSharedWalletCreationStore } from './SharedWalletCreationStore';
import { SharedWalletCreationStep } from './types';

export const SharedWalletCreationUI: VFC = () => {
  const { state, dispatch } = useSharedWalletCreationStore();

  return (
    <>
      {state.step === SharedWalletCreationStep.Setup && (
        <SetupSharedWallet
          walletName={state.walletName}
          activeWalletName={state.activeWalletName}
          activeWalletAddress={''}
          onBack={() => dispatch({ type: 'back' })}
          onNext={() => dispatch({ type: 'next' })}
          onNameChange={(walletName) => dispatch({ type: 'walletNameChanged', walletName })}
        />
      )}
    </>
  );
};
