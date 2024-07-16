import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { WalletRestoreStep } from './types';
import { CreateWalletParams } from '@hooks';
import { useHistory } from 'react-router';
import { walletRoutePaths } from '@routes';
import { useHotWalletCreation } from '../useHotWalletCreation';
import { RecoveryPhraseLength } from '@lace/core';
import { useWalletOnboarding } from '../walletOnboardingContext';
import { deleteFromLocalStorage } from '@utils/local-storage';

type OnNameAndPasswordChange = (state: { name: string; password: string }) => void;

type OnRecoveryPhraseLengthChange = (length: RecoveryPhraseLength) => void;

interface State {
  back: () => void;
  createWalletData: CreateWalletParams;
  finalizeWalletRestoration: () => Promise<void>;
  next: () => Promise<void>;
  onNameAndPasswordChange: OnNameAndPasswordChange;
  onRecoveryPhraseLengthChange: OnRecoveryPhraseLengthChange;
  setMnemonic: (mnemonic: string[]) => void;
  step: WalletRestoreStep;
}

interface Props {
  children: (state: State) => React.ReactNode;
}

// eslint-disable-next-line unicorn/no-null
const RestoreWalletContext = createContext<State>(null);

export const useRestoreWallet = (): State => {
  const state = useContext(RestoreWalletContext);
  if (state === null) throw new Error('RestoreWalletContext not defined');
  return state;
};

const initialMnemonicLength: RecoveryPhraseLength = 24;

export const RestoreWalletProvider = ({ children }: Props): React.ReactElement => {
  const history = useHistory();
  const { forgotPasswordFlowActive, postHogActions, setFormDirty } = useWalletOnboarding();
  const [step, setStep] = useState<WalletRestoreStep>(WalletRestoreStep.RecoveryPhrase);
  const { clearSecrets, createWallet, createWalletData, sendPostWalletAddAnalytics, setCreateWalletData } =
    useHotWalletCreation({
      initialMnemonic: Array.from({ length: initialMnemonicLength }, () => '')
    });

  const setMnemonic = useCallback(
    (mnemonic: string[]) => {
      const mnemonicNotEmpty = mnemonic.some((m) => m);
      setFormDirty(mnemonicNotEmpty);
      setCreateWalletData((prevState) => ({ ...prevState, mnemonic }));
    },
    [setCreateWalletData, setFormDirty]
  );

  const onRecoveryPhraseLengthChange: OnRecoveryPhraseLengthChange = useCallback(
    (length) => {
      setCreateWalletData((prevState) => ({ ...prevState, mnemonic: Array.from({ length }, () => '') }));
    },
    [setCreateWalletData]
  );

  const onNameAndPasswordChange: OnNameAndPasswordChange = useCallback(
    ({ name, password }) => {
      setCreateWalletData((prevState) => ({ ...prevState, name, password }));
    },
    [setCreateWalletData]
  );

  const finalizeWalletRestoration = useCallback(async () => {
    const { source, wallet } = await createWallet();
    void sendPostWalletAddAnalytics({
      extendedAccountPublicKey: source.account.extendedAccountPublicKey,
      postHogActionHdWallet: postHogActions.restore.HD_WALLET,
      postHogActionWalletAdded: postHogActions.restore.WALLET_ADDED,
      wallet
    });
    if (forgotPasswordFlowActive) {
      deleteFromLocalStorage('isForgotPasswordFlow');
    }
    clearSecrets();
  }, [
    clearSecrets,
    createWallet,
    forgotPasswordFlowActive,
    postHogActions.restore.HD_WALLET,
    postHogActions.restore.WALLET_ADDED,
    sendPostWalletAddAnalytics
  ]);

  const next = useCallback(async () => {
    switch (step) {
      case WalletRestoreStep.RecoveryPhrase:
        setStep(WalletRestoreStep.Setup);
        break;
      case WalletRestoreStep.Setup:
        history.push(walletRoutePaths.assets);
        break;
    }
  }, [history, step]);

  const back = useCallback(() => {
    switch (step) {
      case WalletRestoreStep.RecoveryPhrase:
        setFormDirty(false);
        history.push(walletRoutePaths.newWallet.root);
        break;
      case WalletRestoreStep.Setup:
        setStep(WalletRestoreStep.RecoveryPhrase);
        break;
    }
  }, [history, setFormDirty, step]);

  const state = useMemo(
    () => ({
      back,
      createWalletData,
      finalizeWalletRestoration,
      next,
      onNameAndPasswordChange,
      onRecoveryPhraseLengthChange,
      setMnemonic,
      step
    }),
    [
      back,
      createWalletData,
      finalizeWalletRestoration,
      next,
      onNameAndPasswordChange,
      onRecoveryPhraseLengthChange,
      setMnemonic,
      step
    ]
  );

  return <RestoreWalletContext.Provider value={state}>{children(state)}</RestoreWalletContext.Provider>;
};
