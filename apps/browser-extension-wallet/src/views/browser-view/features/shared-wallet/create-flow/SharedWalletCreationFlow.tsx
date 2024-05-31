import { SetupSharedWallet, ShareWalletDetails } from '@lace/core';
import React, { VFC } from 'react';
import { SharedWalletActionType, SharedWalletCreationStore } from './SharedWalletCreationStore';
import { SharedWalletCreationStep } from './types';

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
        {state.step === SharedWalletCreationStep.ShareDetails && (
          <ShareWalletDetails onNext={() => dispatch({ type: SharedWalletActionType.NEXT })} />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
