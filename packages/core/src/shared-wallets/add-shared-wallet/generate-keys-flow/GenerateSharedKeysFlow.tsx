import { WalletType } from '@cardano-sdk/web-extension';
import React, { VFC } from 'react';
import { CopyKeys } from './CopyKeys';
import { EnterPassword, WalletKind } from './EnterPassword';
import { ActionType, GenerateSharedKeysStep, Store, StoreSharedProps } from './Store';

const makeCopyKeysToClipboard = (sharedKeys: string) => async () => {
  await navigator.clipboard.writeText(sharedKeys);
};

export type LinkedWalletType = Exclude<`${WalletType}`, `${WalletType.Script}`>;

const mapWalletType: Record<LinkedWalletType, WalletKind> = {
  InMemory: 'hot',
  Ledger: 'cold',
  Trezor: 'cold',
};

type GenerateSharedKeysFlowProps = StoreSharedProps & {
  activeWalletName: string;
  activeWalletType: LinkedWalletType;
};

export const GenerateSharedKeysFlow: VFC<GenerateSharedKeysFlowProps> = ({
  activeWalletName,
  activeWalletType,
  generateKeys,
  navigateToParentFlow,
}) => (
  <Store generateKeys={generateKeys} navigateToParentFlow={navigateToParentFlow}>
    {({ dispatch, state }) => (
      <>
        {state.step === GenerateSharedKeysStep.EnterPassword && (
          <EnterPassword
            loading={state.loading}
            onBack={() => dispatch({ type: ActionType.Back })}
            onGenerateKeys={(password) => dispatch({ password, type: ActionType.KeysGenerationTriggered })}
            passwordErrorMessage={state.passwordErrorMessage}
            walletKind={mapWalletType[activeWalletType]}
            walletName={activeWalletName}
          />
        )}
        {state.step === GenerateSharedKeysStep.CopyKeys && (
          <CopyKeys
            onClose={() => dispatch({ type: ActionType.CloseFlow })}
            onCopyKeys={makeCopyKeysToClipboard(state.sharedKeys)}
            sharedKeys={state.sharedKeys}
          />
        )}
      </>
    )}
  </Store>
);
