import { WalletType } from '@cardano-sdk/web-extension';
import React, { VFC } from 'react';
import { CopyKey } from './CopyKey';
import { EnterPassword, WalletKind } from './EnterPassword';
import { ActionType, GenerateSharedWalletKeyStep, Store, StoreSharedProps } from './Store';

const makeCopyKeysToClipboard = (sharedWalletKey: string) => async () => {
  await navigator.clipboard.writeText(sharedWalletKey);
};

export type LinkedWalletType = Exclude<`${WalletType}`, `${WalletType.Script}`>;

const mapWalletType: Record<LinkedWalletType, WalletKind> = {
  InMemory: 'hot',
  Ledger: 'cold',
  Trezor: 'cold',
};

type GenerateSharedWalletKeyFlowProps = StoreSharedProps & {
  activeWalletName: string;
  activeWalletType: LinkedWalletType;
};

export const GenerateSharedWalletKeyFlow: VFC<GenerateSharedWalletKeyFlowProps> = ({
  activeWalletName,
  activeWalletType,
  generateKey,
  navigateToParentFlow,
}) => (
  <Store generateKey={generateKey} navigateToParentFlow={navigateToParentFlow}>
    {({ dispatch, state }) => (
      <>
        {state.step === GenerateSharedWalletKeyStep.EnterPassword && (
          <EnterPassword
            loading={state.loading}
            onBack={() => dispatch({ type: ActionType.Back })}
            onGenerateKeys={(password) => dispatch({ password, type: ActionType.KeysGenerationTriggered })}
            passwordErrorType={state.passwordErrorType}
            walletKind={mapWalletType[activeWalletType]}
            walletName={activeWalletName}
          />
        )}
        {state.step === GenerateSharedWalletKeyStep.CopyKey && (
          <CopyKey
            onClose={() => dispatch({ type: ActionType.CloseFlow })}
            onCopyKey={makeCopyKeysToClipboard(state.sharedWalletKey)}
            sharedWalletKey={state.sharedWalletKey}
          />
        )}
      </>
    )}
  </Store>
);
