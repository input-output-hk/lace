import React, { VFC } from 'react';
import { AddCoSigners } from './AddCoSigners';
import { ImportantInfoDialog } from './ImportantInfoDialog';
import { QuorumOption } from './Quorum';
import { SetupSharedWallet } from './SetupSharedWallet';
import { SharedWalletCreationStore, SharedWalletCreationStoreSharedProps } from './SharedWalletCreationStore';
import { ShareWalletDetails } from './ShareWalletDetails';
import { SharedWalletCreationActionType, SharedWalletCreationStep } from './state-and-types';

type SharedWalletCreationFlowProps = SharedWalletCreationStoreSharedProps & {
  onAddCosignersNextClick?: () => Promise<void>;
  onDefineQuorumDownloadClick?: () => Promise<void>;
  onDefineQuorumNextClick?: () => Promise<void>;
  onImportantInfoBackClick?: () => Promise<void>;
  onImportantInfoNextClick?: () => Promise<void>;
  onOpenSharedWalletClick?: () => Promise<void>;
  onWalletNameNextClick?: () => Promise<void>;
};

export const SharedWalletCreationFlow: VFC<SharedWalletCreationFlowProps> = ({
  onWalletNameNextClick,
  onAddCosignersNextClick,
  onImportantInfoNextClick,
  onImportantInfoBackClick,
  onDefineQuorumNextClick,
  onDefineQuorumDownloadClick,
  onOpenSharedWalletClick,
  ...props
}) => (
  <SharedWalletCreationStore {...props}>
    {({ state, dispatch }) => (
      <>
        {state.step === SharedWalletCreationStep.Setup && (
          <SetupSharedWallet
            activeWalletName={state.activeWalletName}
            walletName={state.walletName || ''}
            activeWalletAddress=""
            onBack={() => dispatch({ type: SharedWalletCreationActionType.BACK })}
            onNext={async () => {
              await onWalletNameNextClick?.();
              dispatch({ type: SharedWalletCreationActionType.NEXT });
            }}
            onWalletNameChange={(walletName) =>
              dispatch({ type: SharedWalletCreationActionType.CHANGE_WALLET_NAME, walletName })
            }
          />
        )}
        {(state.step === SharedWalletCreationStep.CoSigners ||
          state.step === SharedWalletCreationStep.CoSignersImportantInfo) && (
          <AddCoSigners
            onBack={() => dispatch({ type: SharedWalletCreationActionType.BACK })}
            onNext={async () => {
              await onAddCosignersNextClick?.();
              dispatch({ type: SharedWalletCreationActionType.NEXT });
            }}
            onValueChange={(coSigner) => dispatch({ coSigner, type: SharedWalletCreationActionType.COSIGNERS_CHANGED })}
            coSigners={state.coSigners}
            coSignersDirty={state.coSignerInputsDirty}
            errors={state.coSignerInputsErrors}
          />
        )}
        {state.step === SharedWalletCreationStep.Quorum && (
          <QuorumOption
            onBack={() => dispatch({ type: SharedWalletCreationActionType.BACK })}
            onNext={async () => {
              await onDefineQuorumNextClick?.();
              dispatch({ type: SharedWalletCreationActionType.NEXT });
            }}
            onChange={(quorumRules) =>
              dispatch({ quorumRules, type: SharedWalletCreationActionType.QUORUM_RULES_CHANGED })
            }
            totalCosignersNumber={state.coSigners.length}
            value={state.quorumRules}
          />
        )}
        {state.step === SharedWalletCreationStep.ShareDetails && (
          <ShareWalletDetails
            onDownloadClick={async () => {
              await onDefineQuorumDownloadClick?.();
            }}
            onNext={async () => {
              await onOpenSharedWalletClick?.();
              dispatch({ type: SharedWalletCreationActionType.NEXT });
            }}
            stateSharedWallet={state}
          />
        )}
        {state.step === SharedWalletCreationStep.CoSignersImportantInfo && (
          <ImportantInfoDialog
            open
            onBack={async () => {
              await onImportantInfoBackClick?.();
              dispatch({ type: SharedWalletCreationActionType.BACK });
            }}
            onNext={async () => {
              await onImportantInfoNextClick?.();
              dispatch({ type: SharedWalletCreationActionType.NEXT });
            }}
            zIndex={1001}
          />
        )}
      </>
    )}
  </SharedWalletCreationStore>
);
