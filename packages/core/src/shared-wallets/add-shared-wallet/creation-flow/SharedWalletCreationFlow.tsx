import React, { VFC } from 'react';
import { AddCoSigners } from './AddCoSigners';
import { ImportantInfoDialog } from './ImportantInfoDialog';
import { QuorumOption } from './Quorum';
import { SetupSharedWallet } from './SetupSharedWallet';
import {
  SharedWalletCreationActionType,
  SharedWalletCreationStore,
  SharedWalletCreationStoreSharedProps,
} from './SharedWalletCreationStore';
import { ShareWalletDetails } from './ShareWalletDetails';
import { SharedWalletCreationStep } from './types';

type SharedWalletCreationFlowProps = SharedWalletCreationStoreSharedProps;

export const SharedWalletCreationFlow: VFC<SharedWalletCreationFlowProps> = (props) => (
  <SharedWalletCreationStore {...props}>
    {({ state, dispatch }) => (
      <>
        {state.step === SharedWalletCreationStep.Setup && (
          <SetupSharedWallet
            activeWalletName={state.activeWalletName}
            walletName={state.walletName || ''}
            activeWalletAddress=""
            onBack={() => dispatch({ type: SharedWalletCreationActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletCreationActionType.NEXT })}
            onWalletNameChange={(walletName) =>
              dispatch({ type: SharedWalletCreationActionType.CHANGE_WALLET_NAME, walletName })
            }
          />
        )}
        {(state.step === SharedWalletCreationStep.CoSigners ||
          state.step === SharedWalletCreationStep.CoSignersImportantInfo) && (
          <AddCoSigners
            onBack={() => dispatch({ type: SharedWalletCreationActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletCreationActionType.NEXT })}
            onValueChange={(coSigner) => dispatch({ coSigner, type: SharedWalletCreationActionType.COSIGNERS_CHANGED })}
            coSigners={state.coSigners}
            coSignersDirty={state.coSignerInputsDirty}
            errors={state.coSignerInputsErrors}
          />
        )}
        {state.step === SharedWalletCreationStep.Quorum && (
          <QuorumOption
            onBack={() => dispatch({ type: SharedWalletCreationActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletCreationActionType.NEXT })}
            onChange={(quorumRules) =>
              dispatch({ quorumRules, type: SharedWalletCreationActionType.QUORUM_RULES_CHANGED })
            }
            totalCosignersNumber={state.coSigners.length + 1}
            value={state.quorumRules}
          />
        )}
        {state.step === SharedWalletCreationStep.ShareDetails && (
          <ShareWalletDetails onNext={() => dispatch({ type: SharedWalletCreationActionType.NEXT })} />
        )}
        {state.step === SharedWalletCreationStep.CoSignersImportantInfo && (
          <ImportantInfoDialog
            open
            onBack={() => dispatch({ type: SharedWalletCreationActionType.BACK })}
            onNext={() => dispatch({ type: SharedWalletCreationActionType.NEXT })}
            zIndex={1001}
          />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
