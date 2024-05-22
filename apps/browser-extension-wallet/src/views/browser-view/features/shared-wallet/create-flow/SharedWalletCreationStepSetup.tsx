import { SetupSharedWallet } from '@lace/core';
import React, { VFC } from 'react';
import { useSharedWalletCreationStore } from './SharedWalletCreationStore';

export const SharedWalletCreationStepSetup: VFC = () => {
  const { state, dispatch } = useSharedWalletCreationStore();
  return (
    <SetupSharedWallet
      activeWalletName={state.activeWalletName}
      activeWalletAddress={''}
      onBack={() => dispatch({ type: 'back' })}
      onNext={() => dispatch({ type: 'next' })}
      onNameChange={(walletName) => dispatch({ type: 'walletNameChanged', walletName })}
    />
  );
};
