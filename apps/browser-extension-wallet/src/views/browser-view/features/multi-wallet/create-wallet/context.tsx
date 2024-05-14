import { CreateWalletParams } from '@hooks';
import { walletRoutePaths } from '@routes';
import { postHogMultiWalletActions } from '@providers/AnalyticsProvider/analyticsTracker';
import React, { createContext, useContext, useState } from 'react';
import { useHistory } from 'react-router';
import { useHotWalletCreation } from '../useHotWalletCreation';
import { Providers } from './types';

interface Props {
  children: React.ReactNode;
  providers: Providers;
}

type OnNameAndPasswordChange = (state: { name: string; password: string }) => void;

export enum WalletCreateStep {
  RecoveryPhraseWriteDown = 'RecoveryPhraseWriteDown',
  RecoveryPhraseInput = 'RecoveryPhraseInput',
  Setup = 'Setup'
}

interface State {
  back: () => void;
  createWalletData: CreateWalletParams;
  next: () => Promise<void>;
  onNameAndPasswordChange: OnNameAndPasswordChange;
  step: WalletCreateStep;
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
  const {
    clearSecrets,
    createWallet: createHotWallet,
    createWalletData,
    sendPostWalletAddAnalytics,
    setCreateWalletData
  } = useHotWalletCreation({
    initialMnemonic: providers.generateMnemonicWords()
  });
  const [step, setStep] = useState<WalletCreateStep>(WalletCreateStep.RecoveryPhraseWriteDown);

  const generateMnemonic = () => {
    setCreateWalletData((prevState) => ({ ...prevState, mnemonic: providers.generateMnemonicWords() }));
  };

  const onNameAndPasswordChange: OnNameAndPasswordChange = ({ name, password }) => {
    setCreateWalletData((prevState) => ({ ...prevState, name, password }));
  };

  const setFormDirty = (dirty: boolean) => {
    providers.shouldShowConfirmationDialog$.next(dirty);
  };

  const finalizeWalletCreation = async () => {
    const wallet = await createHotWallet();
    await sendPostWalletAddAnalytics({
      extendedAccountPublicKey: wallet.source.account.extendedAccountPublicKey,
      walletAddedPostHogAction: postHogMultiWalletActions.create.WALLET_ADDED
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
        history.push(walletRoutePaths.newWallet.create.setup);
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
        next,
        onNameAndPasswordChange,
        step
      }}
    >
      {children}
    </CreateWalletContext.Provider>
  );
};
