import React, { VFC } from 'react';
import { AddCoSigners } from './AddCoSigners';
import { ImportantInfoDialog } from './ImportantInfoDialog';
import { QuorumOption } from './Quorum';
import { SetupSharedWallet } from './SetupSharedWallet';
import { SharedWalletActionType, SharedWalletCreationStore, SharedWalletFlowProps } from './SharedWalletCreationStore';
import { ShareWalletDetails } from './ShareWalletDetails';
import { SharedWalletCreationStep } from './types';

export const SharedWalletCreationFlow: VFC<SharedWalletFlowProps> = (props) => (
  <SharedWalletCreationStore {...props}>
    {({ state, dispatch }) => (
      <>
        {state.step === SharedWalletCreationStep.Setup && (
          <SetupSharedWallet
            activeWalletName={state.activeWalletName}
            walletName={state.walletName || ''}
            activeWalletAddress=""
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
            onValueChange={(coSigner) => dispatch({ coSigner, type: SharedWalletActionType.COSIGNERS_CHANGED })}
            coSigners={state.coSigners}
            coSignersDirty={state.coSignerInputsDirty}
            errors={state.coSignerInputsErrors}
          />
        )}
        {state.step === SharedWalletCreationStep.Quorum && (
          <QuorumOption
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            onChange={(quorumRules) => dispatch({ quorumRules, type: SharedWalletActionType.QUORUM_RULES_CHANGED })}
            totalCosignersNumber={state.coSigners.length + 1}
            value={state.quorumRules}
          />
        )}
        {state.step === SharedWalletCreationStep.ShareDetails && (
          <ShareWalletDetails onNext={() => dispatch({ type: SharedWalletActionType.NEXT })} />
        )}
        {state.step === SharedWalletCreationStep.CoSignersImportantInfo && (
          <ImportantInfoDialog
            open
            onBack={() => dispatch({ type: SharedWalletActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletActionType.NEXT })}
            zIndex={1001}
          />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
