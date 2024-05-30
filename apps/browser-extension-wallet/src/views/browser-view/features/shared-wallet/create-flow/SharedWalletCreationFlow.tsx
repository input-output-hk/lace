import { AddCoSigners, CoSigner, SetupSharedWallet, ValidateAddress } from '@lace/core';
import React, { VFC } from 'react';
import { SharedWalletCreationStore, SharedWalletActionType } from './SharedWalletCreationStore';
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
            walletName={state.walletName}
            activeWalletAddress={''}
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            onWalletNameChange={(walletName) =>
              dispatch({ type: SharedWalletActionType.CHANGE_WALLET_NAME, walletName })
            }
          />
        )}
        {state.step === SharedWalletCreationStep.CoSigners && (
          <AddCoSigners
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            validateAddress={validateAddress}
            onValueChange={(data: CoSigner[]) =>
              dispatch({ type: SharedWalletActionType.COSIGNERS_CHANGED, cosigners: data })
            }
          />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
