import { AddCoSigners, CoSigner, QuorumOption, SetupSharedWallet, ValidateAddress } from '@lace/core';
import React, { VFC } from 'react';
import { SharedWalletActionType, SharedWalletCreationStore } from './SharedWalletCreationStore';
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
            walletName={state.walletName || ''}
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
            onValueChange={(index, data: CoSigner) =>
              dispatch({ type: SharedWalletActionType.COSIGNERS_CHANGED, cosigners: { index, data } })
            }
            coSigners={state.coSigners}
          />
        )}
        {state.step === SharedWalletCreationStep.Quorum && (
          <QuorumOption
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            onChange={(quorumRules) => dispatch({ type: SharedWalletActionType.QUORUM_RULES_CHANGED, quorumRules })}
            totalCosignersNumber={state.coSigners.length}
            value={state.quorumRules}
          />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
