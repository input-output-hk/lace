import { AddCoSigners, ImportantInfoDialog, QuorumOption, SetupSharedWallet, ShareWalletDetails } from '@lace/core';
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
            walletName={state.walletName || ''}
            activeWalletAddress={''}
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            onWalletNameChange={(walletName) =>
              dispatch({ type: SharedWalletActionType.CHANGE_WALLET_NAME, walletName })
            }
          />
        )}
        {(state.step === SharedWalletCreationStep.CoSigners ||
          state.step === SharedWalletCreationStep.CoSignersImportantInfo) && (
          <AddCoSigners
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            onValueChange={(coSigner) => dispatch({ type: SharedWalletActionType.COSIGNERS_CHANGED, coSigner })}
            coSigners={state.coSigners}
            errors={state.coSignersErrors}
          />
        )}
        {state.step === SharedWalletCreationStep.Quorum && (
          <QuorumOption
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            onChange={(quorumRules) => dispatch({ type: SharedWalletActionType.QUORUM_RULES_CHANGED, quorumRules })}
            totalCosignersNumber={state.coSigners.length + 1}
            value={state.quorumRules}
          />
        )}
        {state.step === SharedWalletCreationStep.CoSignersImportantInfo && (
          <ImportantInfoDialog
            open
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            zIndex={1001}
          />
        )}
        {state.step === SharedWalletCreationStep.ShareDetails && (
          <ShareWalletDetails onNext={() => dispatch({ type: SharedWalletActionType.NEXT })} />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
