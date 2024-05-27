import { SetupSharedWallet } from '@lace/core';
import React, { VFC } from 'react';
import { SharedWalletCreationStore } from './SharedWalletCreationStore';
import { SharedWalletCreationStep } from './types';

export const SharedWalletCreationFlow: VFC = () => (
  <SharedWalletCreationStore>
    {({ state, dispatch }) => (
      <>
        {state.step === SharedWalletCreationStep.Setup && (
          <SetupSharedWallet
            activeWalletName={state.activeWalletName}
            activeWalletAddress={''}
            onBack={() => dispatch({ type: 'back' })}
            onNext={() => dispatch({ type: 'next' })}
            onWalletNameChange={(walletName) => dispatch({ type: 'walletNameChanged', walletName })}
            walletName={state.walletName}
          />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
