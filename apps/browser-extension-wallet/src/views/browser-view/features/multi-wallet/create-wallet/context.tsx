import { CreateWalletParams } from '@hooks';
import { Wallet } from '@lace/cardano';
import { walletRoutePaths } from '@routes';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import { useHotWalletCreation } from '../useHotWalletCreation';
import { useWalletOnboarding } from '../walletOnboardingContext';
import { WalletCreateStep } from './types';

type OnNameAndPasswordChange = (state: { name: string; password: string }) => void;

interface State {
  back: () => void;
  createWalletData: CreateWalletParams;
  next: () => Promise<void>;
  onNameAndPasswordChange: OnNameAndPasswordChange;
  step: WalletCreateStep;
}

interface Props {
  children: (state: State) => React.ReactNode;
}

// eslint-disable-next-line unicorn/no-null
const CreateWalletContext = createContext<State>(null);

export const useCreateWallet = (): State => {
  const state = useContext(CreateWalletContext);
  if (state === null) throw new Error('CreateWalletContext not defined');
  return state;
};

export const CreateWalletProvider = ({ children }: Props): React.ReactElement => {
  const history = useHistory();
  const { postHogActions, setFormDirty } = useWalletOnboarding();
  const {
    clearSecrets,
    createWallet: createHotWallet,
    createWalletData,
    sendPostWalletAddAnalytics,
    setCreateWalletData
  } = useHotWalletCreation({
    initialMnemonic: Wallet.KeyManagement.util.generateMnemonicWords()
  });
  const [step, setStep] = useState<WalletCreateStep>(WalletCreateStep.RecoveryPhraseWriteDown);

  const generateMnemonic = () => {
    setCreateWalletData((prevState) => ({ ...prevState, mnemonic: Wallet.KeyManagement.util.generateMnemonicWords() }));
  };

  const onNameAndPasswordChange: OnNameAndPasswordChange = ({ name, password }) => {
    setCreateWalletData((prevState) => ({ ...prevState, name, password }));
  };

  const finalizeWalletCreation = async () => {
    const wallet = await createHotWallet();
    await sendPostWalletAddAnalytics({
      extendedAccountPublicKey: wallet.source.account.extendedAccountPublicKey,
      walletAddedPostHogAction: postHogActions.create.WALLET_ADDED
    });
    clearSecrets();
  };

  const next = async () => {
    switch (step) {
      case WalletCreateStep.RecoveryPhraseWriteDown: {
        setFormDirty(true);
        setStep(WalletCreateStep.RecoveryPhraseInput);
        break;
      }
      case WalletCreateStep.RecoveryPhraseInput: {
        setStep(WalletCreateStep.Setup);
        break;
      }
      case WalletCreateStep.Setup: {
        await finalizeWalletCreation();
        history.push(walletRoutePaths.assets);
        break;
      }
    }
  };

  const back = () => {
    switch (step) {
      case WalletCreateStep.RecoveryPhraseWriteDown: {
        history.push(walletRoutePaths.newWallet.root);
        break;
      }
      case WalletCreateStep.RecoveryPhraseInput: {
        setFormDirty(false);
        generateMnemonic();
        setStep(WalletCreateStep.RecoveryPhraseWriteDown);
        break;
      }
      case WalletCreateStep.Setup: {
        setStep(WalletCreateStep.RecoveryPhraseInput);
        break;
      }
    }
  };

  const state = useMemo(
    () => ({
      back,
      createWalletData,
      next,
      onNameAndPasswordChange,
      step
    }),
    [back, createWalletData, next, onNameAndPasswordChange, step]
  );

  return <CreateWalletContext.Provider value={state}>{children(state)}</CreateWalletContext.Provider>;
};
