import { AddCoSigners, CoSigner, SetupSharedWallet, ValidateAddress } from '@lace/core';
import React, { VFC } from 'react';
import { SharedWalletCreationStore } from './SharedWalletCreationStore';
import { SharedWalletCreationStep } from './types';
import { isValidAddress } from '@utils/validators';

const validateAddress: ValidateAddress = (address: string) => ({
  isValid: !address ? false : isValidAddress(address)
});

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
        {state.step === SharedWalletCreationStep.CoSigners && (
          <AddCoSigners
            onBack={() => dispatch({ type: 'back' })}
            onNext={() => dispatch({ type: 'next' })}
            validateAddress={validateAddress}
            onValueChange={(data: CoSigner[]) => dispatch({ type: 'coSignersChanged', cosigners: data })}
          />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
