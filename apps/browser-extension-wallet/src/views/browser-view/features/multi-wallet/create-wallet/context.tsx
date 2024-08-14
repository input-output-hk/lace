import { CreateWalletParams } from '@hooks';
import { Wallet } from '@lace/cardano';
import { walletRoutePaths } from '@routes';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import { useHotWalletCreation } from '../useHotWalletCreation';
import { useWalletOnboarding } from '../walletOnboardingContext';
import { WalletCreateStep } from './types';

type OnNameChange = (state: { name: string }) => void;

interface State {
  back: () => void;
  createWalletData: CreateWalletParams;
  next: (state?: Partial<CreateWalletParams>) => Promise<void>;
  onNameChange: OnNameChange;
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
    createWallet: createHotWallet,
    createWalletData,
    sendPostWalletAddAnalytics,
    setCreateWalletData
  } = useHotWalletCreation({
    initialMnemonic: Wallet.KeyManagement.util.generateMnemonicWords()
  });
  const [step, setStep] = useState<WalletCreateStep>(WalletCreateStep.RecoveryPhraseWriteDown);

  const generateMnemonic = useCallback(() => {
    setCreateWalletData((prevState) => ({ ...prevState, mnemonic: Wallet.KeyManagement.util.generateMnemonicWords() }));
  }, [setCreateWalletData]);

  const onNameChange: OnNameChange = useCallback(
    ({ name }) => {
      setCreateWalletData((prevState) => ({ ...prevState, name }));
    },
    [setCreateWalletData]
  );

  const finalizeWalletCreation = useCallback(
    async (params: Partial<CreateWalletParams>) => {
      const wallet = await createHotWallet(params);
      await sendPostWalletAddAnalytics({
        extendedAccountPublicKey: wallet.source.account.extendedAccountPublicKey,
        postHogActionWalletAdded: postHogActions.create.WALLET_ADDED
      });
    },
    [createHotWallet, postHogActions.create.WALLET_ADDED, sendPostWalletAddAnalytics]
  );

  const next: State['next'] = useCallback(
    async (state) => {
      if (state) {
        setCreateWalletData((prevState) => ({ ...prevState, ...state }));
      }
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
          if (!state.name) throw new Error('Expected name');
          await finalizeWalletCreation(state);
          history.push(walletRoutePaths.assets);
          break;
        }
      }
    },
    [finalizeWalletCreation, history, setFormDirty, step, setCreateWalletData]
  );

  const back = useCallback(() => {
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
  }, [generateMnemonic, history, setFormDirty, step]);

  const state = useMemo(
    () => ({
      back,
      createWalletData,
      next,
      onNameChange,
      step
    }),
    [back, createWalletData, next, onNameChange, step]
  );

  return <CreateWalletContext.Provider value={state}>{children(state)}</CreateWalletContext.Provider>;
};
