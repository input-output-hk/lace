/* eslint-disable unicorn/consistent-function-scoping */
import { WalletType } from '@cardano-sdk/web-extension';
import React, { VFC } from 'react';
import { CopyKey } from './CopyKey';
import { EnterPassword, WalletKind } from './EnterPassword';
import { ActionType, GenerateSharedWalletKeyStep, Store, StoreSharedProps } from './Store';

export type LinkedWalletType = Exclude<`${WalletType}`, `${WalletType.Script}`>;

const mapWalletType: Record<LinkedWalletType, WalletKind> = {
  InMemory: 'hot',
  Ledger: 'cold',
  Trezor: 'cold',
};

type GenerateSharedWalletKeyFlowProps = StoreSharedProps & {
  activeWalletName: string;
  activeWalletType: LinkedWalletType;
  onClose?: () => Promise<void>;
  onCopyKeys?: () => Promise<void>;
  onGenerateKeys?: () => void;
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
  <Store generateKey={generateKey} navigateToParentFlow={navigateToParentFlow}>
    {({ dispatch, state }) => (
      <>
        {state.step === GenerateSharedWalletKeyStep.EnterPassword && (
          <EnterPassword
            loading={state.loading}
            onBack={() => dispatch({ type: ActionType.Back })}
            onGenerateKeys={(password) => {
              onGenerateKeys?.();
              dispatch({ password, type: ActionType.KeysGenerationTriggered });
            }}
            passwordErrorType={state.passwordErrorType}
            walletKind={mapWalletType[activeWalletType]}
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
