/* eslint-disable unicorn/consistent-function-scoping */
import { WalletType } from '@cardano-sdk/web-extension';
import React, { VFC } from 'react';
import { LinkedWalletType } from '@src/shared-wallets/types';
import { parseConnectionError } from '@src/ui/utils';
import { CopyKey } from './CopyKey';
import { EnterPassword, PasswordErrorType, WalletKind } from './EnterPassword';
import { GenerateSharedWalletKeyFn, SharedWalletKeyGenerationAuthError } from './generate-shared-wallet-key';
import { ActionType, GenerateSharedWalletKeyStep, Store, StoreSharedProps } from './Store';

const mapWalletType: Record<LinkedWalletType, WalletKind> = {
  [WalletType.InMemory]: 'hot',
  [WalletType.Ledger]: 'cold',
  [WalletType.Trezor]: 'cold',
};

type GenerateSharedWalletKeyFlowProps = StoreSharedProps & {
  activeWalletName: string;
  activeWalletType: LinkedWalletType;
  generateKey: GenerateSharedWalletKeyFn;
  onClose?: () => Promise<void>;
  onCopyKeys?: () => Promise<void>;
  onGenerateKeys?: () => void;
};

const getGenerateKeyErrorType = (error: unknown) => {
  let errorType: PasswordErrorType = 'generic';

  if (error instanceof Error) {
    errorType = parseConnectionError(error);
  }

  if (errorType === 'generic') {
    errorType = error instanceof SharedWalletKeyGenerationAuthError ? 'invalid-password' : 'generic';
  }

  return errorType;
};

export const GenerateSharedWalletKeyFlow: VFC<GenerateSharedWalletKeyFlowProps> = ({
  activeWalletName,
  activeWalletType,
  generateKey,
  onGenerateKeys,
  onCopyKeys,
  onClose,
  navigateToParentFlow,
}) => (
  <Store navigateToParentFlow={navigateToParentFlow}>
    {({ dispatch, state }) => (
      <>
        {state.step === GenerateSharedWalletKeyStep.EnterPassword && (
          <EnterPassword
            loading={state.loading}
            onBack={() => dispatch({ type: ActionType.Back })}
            onGenerateKeys={(password) => {
              onGenerateKeys?.();
              dispatch({ password, type: ActionType.KeysGenerationTriggered });
              generateKey(password)
                .then((sharedWalletKey) => dispatch({ sharedWalletKey, type: ActionType.KeysGenerationCompleted }))
                .catch((error) => {
                  dispatch({ errorType: getGenerateKeyErrorType(error), type: ActionType.KeysGenerationFailed });
                });
            }}
            passwordErrorType={state.passwordErrorType}
            walletKind={mapWalletType[activeWalletType]}
            walletType={activeWalletType}
            walletName={activeWalletName}
          />
        )}
        {state.step === GenerateSharedWalletKeyStep.CopyKey && (
          <CopyKey
            onClose={async () => {
              await onClose?.();
              dispatch({ type: ActionType.CloseFlow });
            }}
            onCopyKey={async () => {
              onCopyKeys?.();
              await navigator.clipboard.writeText(state.sharedWalletKey);
            }}
            sharedWalletKey={state.sharedWalletKey}
          />
        )}
      </>
    )}
  </Store>
);
