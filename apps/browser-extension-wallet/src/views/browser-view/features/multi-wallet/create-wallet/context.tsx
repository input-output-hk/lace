/* eslint-disable unicorn/no-null, complexity */
import { CreateWalletParams } from '@hooks';
import { Wallet } from '@lace/cardano';
import { walletRoutePaths } from '@routes';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import { useHotWalletCreation } from '../useHotWalletCreation';
import { useWalletOnboarding } from '../walletOnboardingContext';
import { WalletCreateStep } from './types';
import { RecoveryMethod } from '../types';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { PublicPgpKeyData } from '@src/types';
import { Blockchain } from '@cardano-sdk/web-extension';

type OnNameChange = (state: { name: string }) => void;
interface PgpValidation {
  error?: string;
  success?: string;
}

interface State {
  back: () => void;
  createWalletData: CreateWalletParams;
  next: (state?: Partial<CreateWalletParams>) => Promise<void>;
  onNameChange: OnNameChange;
  step: WalletCreateStep;
  recoveryMethod: RecoveryMethod;
  setRecoveryMethod: (value: RecoveryMethod) => void;
  pgpInfo: PublicPgpKeyData;
  setPgpInfo: React.Dispatch<React.SetStateAction<PublicPgpKeyData>>;
  pgpValidation: PgpValidation;
  setPgpValidation: React.Dispatch<React.SetStateAction<PgpValidation>>;
  selectedBlockchain: Blockchain;
  setSelectedBlockchain: React.Dispatch<React.SetStateAction<Blockchain>>;
}

interface Props {
  children: (state: State) => React.ReactNode;
}

const CreateWalletContext = createContext<State>(null);

export const useCreateWallet = (): State => {
  const state = useContext(CreateWalletContext);
  if (state === null) throw new Error('CreateWalletContext not defined');
  return state;
};
const INITIAL_PGP_STATE: PublicPgpKeyData = {
  pgpPublicKey: null,
  pgpKeyReference: null
};
export const CreateWalletProvider = ({ children }: Props): React.ReactElement => {
  const history = useHistory();
  const { postHogActions, setFormDirty } = useWalletOnboarding();
  const posthog = usePostHogClientContext();
  const paperWalletEnabled = posthog?.isFeatureFlagEnabled('create-paper-wallet');
  const {
    createWallet: createHotWallet,
    createWalletData,
    sendPostWalletAddAnalytics,
    setCreateWalletData
  } = useHotWalletCreation({
    initialMnemonic: Wallet.KeyManagement.util.generateMnemonicWords()
  });
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain>('Cardano');
  const [step, setStep] = useState<WalletCreateStep>(WalletCreateStep.SelectBlockchain);
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('mnemonic');
  const [pgpInfo, setPgpInfo] = useState<PublicPgpKeyData>(INITIAL_PGP_STATE);
  const [pgpValidation, setPgpValidation] = useState<PgpValidation>({ error: null, success: null });
  const generateMnemonic = useCallback(() => {
    setCreateWalletData((prevState) => ({ ...prevState, mnemonic: Wallet.KeyManagement.util.generateMnemonicWords() }));
  }, [setCreateWalletData]);

  const onNameChange: OnNameChange = useCallback(
    ({ name }) => {
      setCreateWalletData((prevState) => ({ ...prevState, name }));
    },
    [setCreateWalletData]
  );

  const finalizeBitcoinWalletCreation = useCallback(async () => {
    console.error('finalizeBitcoinWalletCreation');
  }, []);

  const finalizeWalletCreation = useCallback(
    async (params: Partial<CreateWalletParams>) => {
      const wallet = await createHotWallet({ ...params, blockchain: selectedBlockchain });
      await sendPostWalletAddAnalytics({
        extendedAccountPublicKey: wallet.source.account.extendedAccountPublicKey,
        postHogActionWalletAdded: postHogActions.create.WALLET_ADDED
      });
      pgpInfo.pgpPublicKey = '';
      pgpInfo.pgpKeyReference = '';
      setPgpInfo(INITIAL_PGP_STATE);
    },
    [createHotWallet, selectedBlockchain, sendPostWalletAddAnalytics, postHogActions.create.WALLET_ADDED, pgpInfo]
  );

  const next: State['next'] = useCallback(
    // eslint-disable-next-line max-statements
    async (state) => {
      if (state) {
        setCreateWalletData((prevState) => ({ ...prevState, ...state }));
      }
      switch (step) {
        case WalletCreateStep.SelectBlockchain: {
          setFormDirty(true);
          setStep(
            paperWalletEnabled ? WalletCreateStep.ChooseRecoveryMethod : WalletCreateStep.RecoveryPhraseWriteDown
          );
          break;
        }
        case WalletCreateStep.ChooseRecoveryMethod: {
          if (recoveryMethod === 'mnemonic' || recoveryMethod === 'mnemonic-bitcoin') {
            setStep(WalletCreateStep.RecoveryPhraseWriteDown);
            break;
          }
          setStep(WalletCreateStep.SecurePaperWallet);
          break;
        }
        case WalletCreateStep.RecoveryPhraseWriteDown: {
          setFormDirty(true);
          setStep(WalletCreateStep.RecoveryPhraseInput);
          break;
        }
        case WalletCreateStep.SecurePaperWallet:
        case WalletCreateStep.RecoveryPhraseInput: {
          setStep(WalletCreateStep.Setup);
          break;
        }
        case WalletCreateStep.Setup: {
          if (recoveryMethod === 'mnemonic') {
            await finalizeWalletCreation(state);
            history.push(walletRoutePaths.assets);
            window.location.reload();
            break;
          }

          if (recoveryMethod === 'mnemonic-bitcoin') {
            await finalizeBitcoinWalletCreation();
            history.push(walletRoutePaths.assets);
            window.location.reload();
            break;
          }

          setStep(WalletCreateStep.SavePaperWallet);
          break;
        }
        case WalletCreateStep.SavePaperWallet: {
          if (!state.name) throw new Error('Expected name');
          await finalizeWalletCreation(state);
          history.push(walletRoutePaths.assets);
          window.location.reload();
          break;
        }
      }
    },
    [
      step,
      setCreateWalletData,
      paperWalletEnabled,
      recoveryMethod,
      setFormDirty,
      finalizeWalletCreation,
      history,
      finalizeBitcoinWalletCreation
    ]
  );

  const back = useCallback(() => {
    switch (step) {
      case WalletCreateStep.SelectBlockchain: {
        setFormDirty(false);
        history.push(walletRoutePaths.newWallet.root);
        break;
      }
      case WalletCreateStep.ChooseRecoveryMethod: {
        setFormDirty(false);
        setStep(WalletCreateStep.SelectBlockchain);
        break;
      }
      case WalletCreateStep.RecoveryPhraseWriteDown: {
        setFormDirty(false);
        paperWalletEnabled
          ? setStep(WalletCreateStep.ChooseRecoveryMethod)
          : history.push(walletRoutePaths.newWallet.root);
        break;
      }
      case WalletCreateStep.SecurePaperWallet: {
        setStep(WalletCreateStep.ChooseRecoveryMethod);
        break;
      }
      case WalletCreateStep.RecoveryPhraseInput: {
        setFormDirty(false);
        generateMnemonic();
        setStep(WalletCreateStep.RecoveryPhraseWriteDown);
        break;
      }
      case WalletCreateStep.Setup: {
        if (recoveryMethod === 'mnemonic') {
          setStep(WalletCreateStep.RecoveryPhraseInput);
          break;
        }
        setStep(WalletCreateStep.SecurePaperWallet);
        break;
      }
      case WalletCreateStep.SavePaperWallet: {
        setStep(WalletCreateStep.Setup);
        break;
      }
    }
  }, [generateMnemonic, history, setFormDirty, step, recoveryMethod, paperWalletEnabled]);

  const state = useMemo(
    (): State => ({
      back,
      createWalletData,
      next,
      onNameChange,
      step,
      recoveryMethod,
      setRecoveryMethod,
      pgpInfo,
      setPgpInfo,
      pgpValidation,
      setPgpValidation,
      selectedBlockchain,
      setSelectedBlockchain
    }),
    [
      back,
      createWalletData,
      next,
      onNameChange,
      step,
      recoveryMethod,
      setRecoveryMethod,
      pgpInfo,
      setPgpInfo,
      pgpValidation,
      setPgpValidation,
      selectedBlockchain,
      setSelectedBlockchain
    ]
  );

  return <CreateWalletContext.Provider value={state}>{children(state)}</CreateWalletContext.Provider>;
};
