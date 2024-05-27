import { AddCoSigners, SetupSharedWallet, ValidateAddress } from '@lace/core';
import React, { VFC } from 'react';
import { SharedWalletCreationStore } from './SharedWalletCreationStore';
import { SharedWalletCreationStep } from './types';
import { isValidAddress } from '@utils/validators';

const validateAddress: ValidateAddress = async (address: string) => {
  if (!address) {
    return { isValid: false };
  }

  return {
    isValid: isValidAddress(address)
  };
};

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
            onNameChange={(walletName) => dispatch({ type: 'walletNameChanged', walletName })}
          />
        )}
        {state.step === SharedWalletCreationStep.CoSigners && (
          <AddCoSigners
            onBack={() => dispatch({ type: 'back' })}
            onNext={() => dispatch({ type: 'next' })}
            validateAddress={validateAddress}
            onValueChange={(data) => dispatch({ type: 'coSignersChanged', cosigners: data })}
          />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
