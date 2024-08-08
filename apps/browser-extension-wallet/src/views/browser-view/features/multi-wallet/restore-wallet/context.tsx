/* eslint-disable unicorn/no-null */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { WalletRestoreStep } from './types';
import { CreateWalletParams } from '@hooks';
import { useHistory } from 'react-router';
import { walletRoutePaths } from '@routes';
import { useHotWalletCreation } from '../useHotWalletCreation';
import { RecoveryPhraseLength } from '@lace/core';
import { useWalletOnboarding } from '../walletOnboardingContext';
import { deleteFromLocalStorage } from '@utils/local-storage';
import { RecoveryMethod } from '../types';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { ShieldedPgpKeyData } from '@src/types';
import { ChainName } from '@lace/cardano/dist/wallet';

type OnNameAndPasswordChange = (state: { name: string; password: string }) => void;
type OnRecoveryPhraseLengthChange = (length: RecoveryPhraseLength) => void;
type WalletSummaryInfo = {
  address: string;
  chain: ChainName;
};

interface State {
  back: () => void;
  createWalletData: CreateWalletParams;
  finalizeWalletRestoration: () => Promise<void>;
  next: () => Promise<void>;
  onNameAndPasswordChange: OnNameAndPasswordChange;
  onRecoveryPhraseLengthChange: OnRecoveryPhraseLengthChange;
  setMnemonic: (mnemonic: string[]) => void;
  step: WalletRestoreStep;
  recoveryMethod: RecoveryMethod;
  setRecoveryMethod: (value: RecoveryMethod) => void;
  pgpInfo: ShieldedPgpKeyData;
  setPgpInfo: React.Dispatch<React.SetStateAction<ShieldedPgpKeyData>>;
  walletMetadata: WalletSummaryInfo;
  setWalletMetadata: React.Dispatch<React.SetStateAction<WalletSummaryInfo>>;
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

const INITIAL_PGP_INFO_STATE: ShieldedPgpKeyData = {
  pgpPrivateKey: null,
  shieldedMessage: null,
  privateKeyIsDecrypted: true,
  pgpKeyPassphrase: null
};

export const RestoreWalletProvider = ({ children }: Props): React.ReactElement => {
  const history = useHistory();
  const { forgotPasswordFlowActive, postHogActions, setFormDirty } = useWalletOnboarding();
  const posthog = usePostHogClientContext();
  const paperWalletEnabled = posthog?.featureFlags?.['restore-paper-wallet'] === true;

  const [step, setStep] = useState<WalletRestoreStep>(
    paperWalletEnabled ? WalletRestoreStep.ChooseRecoveryMethod : WalletRestoreStep.RecoveryPhrase
  );
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('mnemonic');
  const [pgpInfo, setPgpInfo] = useState<ShieldedPgpKeyData>(INITIAL_PGP_INFO_STATE);
  const [walletMetadata, setWalletMetadata] = useState<WalletSummaryInfo>({
    address: null,
    chain: null
  });
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
    setPgpInfo(INITIAL_PGP_INFO_STATE);
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
      case WalletRestoreStep.ChooseRecoveryMethod: {
        if (recoveryMethod === 'mnemonic') {
          setStep(WalletRestoreStep.RecoveryPhrase);
          break;
        }
        setStep(WalletRestoreStep.ScanQrCode);
        break;
      }
      case WalletRestoreStep.ScanQrCode: {
        setStep(WalletRestoreStep.SummaryWalletInfo);
        break;
      }
      case WalletRestoreStep.SummaryWalletInfo: {
        setStep(WalletRestoreStep.PrivatePgpKeyEntry);
        break;
      }
      case WalletRestoreStep.PrivatePgpKeyEntry:
      case WalletRestoreStep.RecoveryPhrase:
        setStep(WalletRestoreStep.Setup);
        break;
      case WalletRestoreStep.Setup:
        history.push(walletRoutePaths.assets);
        break;
    }
  }, [history, step, recoveryMethod]);

  const back = useCallback(() => {
    switch (step) {
      case WalletRestoreStep.ChooseRecoveryMethod: {
        setFormDirty(false);
        history.push(walletRoutePaths.newWallet.root);
        break;
      }
      case WalletRestoreStep.RecoveryPhrase: {
        paperWalletEnabled
          ? setStep(WalletRestoreStep.ChooseRecoveryMethod)
          : history.push(walletRoutePaths.newWallet.root);
        break;
      }
      case WalletRestoreStep.ScanQrCode: {
        setStep(WalletRestoreStep.ChooseRecoveryMethod);
        break;
      }
      case WalletRestoreStep.SummaryWalletInfo: {
        setStep(WalletRestoreStep.ScanQrCode);
        break;
      }
      case WalletRestoreStep.PrivatePgpKeyEntry: {
        setStep(WalletRestoreStep.SummaryWalletInfo);
        break;
      }
      case WalletRestoreStep.Setup:
        if (recoveryMethod === 'mnemonic') {
          setStep(WalletRestoreStep.RecoveryPhrase);
          break;
        }
        setStep(WalletRestoreStep.PrivatePgpKeyEntry);
        break;
    }
  }, [history, setFormDirty, step, recoveryMethod, paperWalletEnabled]);

  const state = useMemo(
    () => ({
      back,
      createWalletData,
      finalizeWalletRestoration,
      next,
      onNameAndPasswordChange,
      onRecoveryPhraseLengthChange,
      setMnemonic,
      step,
      recoveryMethod,
      setRecoveryMethod,
      pgpInfo,
      setPgpInfo,
      walletMetadata,
      setWalletMetadata
    }),
    [
      back,
      createWalletData,
      finalizeWalletRestoration,
      next,
      onNameAndPasswordChange,
      onRecoveryPhraseLengthChange,
      setMnemonic,
      step,
      recoveryMethod,
      setRecoveryMethod,
      pgpInfo,
      setPgpInfo,
      walletMetadata,
      setWalletMetadata
    ]
  );

  return <RestoreWalletContext.Provider value={state}>{children(state)}</RestoreWalletContext.Provider>;
};
