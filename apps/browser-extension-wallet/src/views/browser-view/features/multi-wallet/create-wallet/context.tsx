import { CreateWalletParams, useWalletManager } from '@hooks';
import { PostHogAction } from '@lace/common';
import { useAnalyticsContext } from '@providers';
import { walletRoutePaths } from '@routes';
import { getWalletAccountsQtyString } from '@src/utils/get-wallet-count-string';
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
  const analytics = useAnalyticsContext();
  const { createWallet, walletRepository } = useWalletManager();
  const { clearSecrets, createWalletData, setCreateWalletData } = useSoftwareWalletCreation({
    initialMnemonic: providers.generateMnemonicWords()
  });
  const [step, setStep] = useState<Step>(Step.RecoveryPhrase);

  const generateMnemonic = () => {
    setCreateWalletData((prevState) => ({ ...prevState, mnemonic: providers.generateMnemonicWords() }));
  };

  const onNameAndPasswordChange: OnNameAndPasswordChange = ({ name, password }) => {
    setCreateWalletData((prevState) => ({ ...prevState, name, password }));
  };

  const completeCreation = async () => {
    const { source } = await createWallet(createWalletData);
    void analytics.sendEventToPostHog(PostHogAction.MultiWalletCreateAdded, {
      // eslint-disable-next-line camelcase
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletRepository) }
    });
    void analytics.sendMergeEvent(source.account.extendedAccountPublicKey);
    clearSecrets();
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
        await completeCreation();
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
