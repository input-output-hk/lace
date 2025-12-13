/* eslint-disable unicorn/no-null, complexity */
import { CreateWalletParams, useLocalStorage, useLMP } from '@hooks';
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
import { Blockchain, WalletConflictError, WalletType } from '@cardano-sdk/web-extension';
import { useObservable } from '@lace/common';
import { walletRepository } from '@lib/wallet-api-ui';
import { getWalletBlockchain } from './get-wallet-blockchain';
import { WalletWithMnemonic } from '@lace/core';

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
  walletToReuse: WalletWithMnemonic | null;
  setWalletToReuse: React.Dispatch<React.SetStateAction<WalletWithMnemonic | null>>;
  showRecoveryPhraseError: () => void;
  setMnemonic: (mnemonic: string[]) => void;
  nonSelectedBlockchainWallets: WalletWithMnemonic[] | undefined;
  setStep: React.Dispatch<React.SetStateAction<WalletCreateStep>>;
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
  const [, { updateLocalStorage: setShowWalletConflictError }] = useLocalStorage('showWalletConflictError', false);
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain>('Cardano');
  const [step, setStep] = useState<WalletCreateStep>(WalletCreateStep.SelectBlockchain);
  const [walletToReuse, setWalletToReuse] = useState<WalletWithMnemonic | null>(null);
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('mnemonic');
  const { midnightWallets } = useLMP();
  const [pgpInfo, setPgpInfo] = useState<PublicPgpKeyData>(INITIAL_PGP_STATE);
  const [pgpValidation, setPgpValidation] = useState<PgpValidation>({ error: null, success: null });
  const wallets = useObservable(walletRepository.wallets$);

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

  const nonSelectedBlockchainWallets = useMemo((): WalletWithMnemonic[] | undefined => {
    // Filter v1 wallets that are not the selected blockchain and are in-memory (have recovery phrase)
    const v1Wallets =
      wallets?.filter(
        (wallet) =>
          getWalletBlockchain(wallet).toLowerCase() !== selectedBlockchain.toLowerCase() &&
          wallet.type === WalletType.InMemory
      ) ?? [];

    // Include Midnight wallets that have encrypted recovery phrase
    const filteredMidnightWallets: WalletWithMnemonic[] = midnightWallets
      ? midnightWallets.filter((w) => w.encryptedRecoveryPhrase)
      : [];

    const combined = [...v1Wallets, ...filteredMidnightWallets];
    return combined.length > 0 ? combined : undefined;
  }, [selectedBlockchain, wallets, midnightWallets]);

  const showRecoveryPhraseError = useCallback(() => setStep(WalletCreateStep.RecoveryPhraseError), [setStep]);
  const setMnemonic = useCallback(
    (mnemonic: string[]) =>
      setCreateWalletData((prevState) => ({
        ...prevState,
        mnemonic
      })),
    [setCreateWalletData]
  );

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

  const handleSetupStep = useCallback(
    // eslint-disable-next-line consistent-return
    async (state: Partial<CreateWalletParams>) => {
      if (recoveryMethod !== 'mnemonic' && recoveryMethod !== 'mnemonic-bitcoin') {
        return setStep(WalletCreateStep.SavePaperWallet);
      }

      try {
        const finalizationFn = recoveryMethod === 'mnemonic' ? finalizeWalletCreation : finalizeBitcoinWalletCreation;
        await finalizationFn(state);
      } catch (error) {
        if (error instanceof WalletConflictError) {
          setShowWalletConflictError(true);
        } else {
          throw error;
        }
      } finally {
        history.push(walletRoutePaths.assets);
        window.location.reload();
      }
    },
    [recoveryMethod, finalizeWalletCreation, finalizeBitcoinWalletCreation, history, setShowWalletConflictError]
  );

  // eslint-disable-next-line max-statements, sonarjs/cognitive-complexity
  const next: State['next'] = useCallback(
    async (state) => {
      if (state) {
        setCreateWalletData((prevState) => ({ ...prevState, ...state }));
      }
      switch (step) {
        case WalletCreateStep.SelectBlockchain: {
          // Note: Midnight redirects to v2 directly from SelectBlockchain component
          setStep(
            paperWalletEnabled ? WalletCreateStep.ChooseRecoveryMethod : WalletCreateStep.RecoveryPhraseWriteDown
          );
          break;
        }
        case WalletCreateStep.ChooseRecoveryMethod: {
          if (recoveryMethod === 'mnemonic' || recoveryMethod === 'mnemonic-bitcoin') {
            if (nonSelectedBlockchainWallets && nonSelectedBlockchainWallets.length > 0) {
              setStep(WalletCreateStep.ReuseRecoveryPhrase);
            } else {
              setStep(WalletCreateStep.RecoveryPhraseWriteDown);
            }
            break;
          }
          setStep(WalletCreateStep.SecurePaperWallet);
          break;
        }
        case WalletCreateStep.ReuseRecoveryPhrase: {
          setStep(WalletCreateStep.EnterWalletPassword);
          break;
        }
        case WalletCreateStep.EnterWalletPassword:
          setStep(WalletCreateStep.Setup);
          break;
        case WalletCreateStep.RecoveryPhraseError: {
          setStep(WalletCreateStep.RecoveryPhraseWriteDown);
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
          await handleSetupStep(state);
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
      setFormDirty,
      paperWalletEnabled,
      recoveryMethod,
      nonSelectedBlockchainWallets,
      handleSetupStep,
      finalizeWalletCreation,
      history
    ]
  );

  // eslint-disable-next-line max-statements
  const back = useCallback(() => {
    switch (step) {
      case WalletCreateStep.SelectBlockchain:
        setFormDirty(false);
        history.push(walletRoutePaths.newWallet.root);
        break;
      case WalletCreateStep.ChooseRecoveryMethod:
        setFormDirty(false);
        setStep(WalletCreateStep.SelectBlockchain);
        break;
      case WalletCreateStep.RecoveryPhraseWriteDown:
        setFormDirty(false);
        setStep(paperWalletEnabled ? WalletCreateStep.ChooseRecoveryMethod : undefined);
        if (!paperWalletEnabled) history.push(walletRoutePaths.newWallet.root);
        break;
      case WalletCreateStep.ReuseRecoveryPhrase:
        setStep(WalletCreateStep.RecoveryPhraseWriteDown);
        break;
      case WalletCreateStep.SecurePaperWallet:
        setStep(WalletCreateStep.ChooseRecoveryMethod);
        break;
      case WalletCreateStep.EnterWalletPassword:
      case WalletCreateStep.RecoveryPhraseError:
        setStep(WalletCreateStep.ReuseRecoveryPhrase);
        break;
      case WalletCreateStep.RecoveryPhraseInput:
        setFormDirty(false);
        generateMnemonic();
        setStep(WalletCreateStep.RecoveryPhraseWriteDown);
        break;
      case WalletCreateStep.Setup:
        if (walletToReuse) {
          setStep(WalletCreateStep.EnterWalletPassword);
        } else {
          setStep(
            recoveryMethod === 'mnemonic' ? WalletCreateStep.RecoveryPhraseInput : WalletCreateStep.SecurePaperWallet
          );
        }
        break;
      case WalletCreateStep.SavePaperWallet:
        setStep(WalletCreateStep.Setup);
        break;
    }
  }, [generateMnemonic, history, setFormDirty, step, recoveryMethod, paperWalletEnabled, walletToReuse]);

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
      setSelectedBlockchain,
      setWalletToReuse,
      walletToReuse,
      showRecoveryPhraseError,
      setMnemonic,
      nonSelectedBlockchainWallets,
      setStep
    }),
    [
      back,
      createWalletData,
      next,
      onNameChange,
      step,
      recoveryMethod,
      pgpInfo,
      pgpValidation,
      selectedBlockchain,
      walletToReuse,
      showRecoveryPhraseError,
      setMnemonic,
      nonSelectedBlockchainWallets
    ]
  );

  return <CreateWalletContext.Provider value={state}>{children(state)}</CreateWalletContext.Provider>;
};
