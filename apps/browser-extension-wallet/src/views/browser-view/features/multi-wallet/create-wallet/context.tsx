import { CreateWalletParams } from '@hooks';
import { PostHogAction } from '@lace/common';
import { walletRoutePaths } from '@routes';
import React, { createContext, useContext, useState } from 'react';
import { useHistory } from 'react-router';
import { useSoftwareWalletCreation } from '../useSoftwareWalletCreation';
import { Providers } from './types';

interface Props {
  children: React.ReactNode;
  providers: Providers;
}

type OnNameAndPasswordChange = (state: { name: string; password: string }) => void;

enum Step {
  RecoveryPhrase = 'RecoveryPhrase',
  Setup = 'Setup'
}

interface State {
  back: () => void;
  createWalletData: CreateWalletParams;
  generateMnemonic: () => void;
  next: () => Promise<void>;
  onNameAndPasswordChange: OnNameAndPasswordChange;
  setFormDirty: (dirty: boolean) => void;
}

// eslint-disable-next-line unicorn/no-null
const CreateWalletContext = createContext<State>(null);

export const useCreateWallet = (): State => {
  const state = useContext(CreateWalletContext);
  if (state === null) throw new Error('CreateWalletContext not defined');
  return state;
};

export const CreateWalletProvider = ({ children, providers }: Props): React.ReactElement => {
  const history = useHistory();
  const { clearSecrets, createWallet, createWalletData, setCreateWalletData } = useSoftwareWalletCreation({
    initialMnemonic: providers.generateMnemonicWords(),
    postHogActionWalletAdded: PostHogAction.MultiWalletCreateAdded
  });
  const [step, setStep] = useState<Step>(Step.RecoveryPhrase);

  const generateMnemonic = () => {
    setCreateWalletData((prevState) => ({ ...prevState, mnemonic: providers.generateMnemonicWords() }));
  };

  const onNameAndPasswordChange: OnNameAndPasswordChange = ({ name, password }) => {
    setCreateWalletData((prevState) => ({ ...prevState, name, password }));
  };

  const setFormDirty = (dirty: boolean) => {
    providers.confirmationDialog.shouldShowDialog$.next(dirty);
  };

  const next = async () => {
    switch (step) {
      case Step.RecoveryPhrase: {
        setStep(Step.Setup);
        history.push(walletRoutePaths.newWallet.create.setup);
        break;
      }
      case Step.Setup: {
        await createWallet();
        clearSecrets();
        history.push(walletRoutePaths.assets);
        break;
      }
    }
  };

  const back = () => {
    switch (step) {
      case Step.RecoveryPhrase: {
        setFormDirty(false);
        history.push(walletRoutePaths.newWallet.root);
        break;
      }
      case Step.Setup: {
        setStep(Step.RecoveryPhrase);
        history.push(walletRoutePaths.newWallet.create.recoveryPhrase);
        break;
      }
    }
  };

  return (
    <CreateWalletContext.Provider
      value={{
        back,
        createWalletData,
        generateMnemonic,
        next,
        onNameAndPasswordChange,
        setFormDirty
      }}
    >
      {children}
    </CreateWalletContext.Provider>
  );
};
