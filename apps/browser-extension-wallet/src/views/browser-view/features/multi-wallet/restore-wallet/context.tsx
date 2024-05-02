import React, { createContext, useCallback, useContext, useState } from 'react';
import { Providers } from './types';
import { CreateWalletParams } from '@hooks';
import { Wallet } from '@lace/cardano';
import { PostHogAction } from '@lace/common';
import { useHistory } from 'react-router';
import { useAnalyticsContext } from '@providers';
import { filter, firstValueFrom } from 'rxjs';
import { isScriptAddress } from '@cardano-sdk/wallet';
import { walletRoutePaths } from '@routes';
import { useHotWalletCreation } from '../useHotWalletCreation';
import { RecoveryPhraseLength } from '@lace/core';

interface Props {
  children: React.ReactNode;
  providers: Providers;
}

type OnNameAndPasswordChange = (state: { name: string; password: string }) => void;

type OnRecoveryPhraseLengthChange = (length: RecoveryPhraseLength) => void;

enum WalletRestoreStep {
  RecoveryPhrase = 'RecoveryPhrase',
  Setup = 'Setup'
}

interface State {
  back: () => void;
  finalizeWalletRestoration: () => Promise<void>;
  createWalletData: CreateWalletParams;
  next: () => Promise<void>;
  onNameAndPasswordChange: OnNameAndPasswordChange;
  setMnemonic: (mnemonic: string[]) => void;
  onRecoveryPhraseLengthChange: OnRecoveryPhraseLengthChange;
}

// eslint-disable-next-line unicorn/no-null
const RestoreWalletContext = createContext<State>(null);

export const useRestoreWallet = (): State => {
  const state = useContext(RestoreWalletContext);
  if (state === null) throw new Error('RestoreWalletContext not defined');
  return state;
};

const initialMnemonicLength: RecoveryPhraseLength = 24;

export const RestoreWalletProvider = ({ children, providers }: Props): React.ReactElement => {
  const history = useHistory();
  const analytics = useAnalyticsContext();
  const [step, setStep] = useState<WalletRestoreStep>(WalletRestoreStep.RecoveryPhrase);
  const { clearSecrets, createWallet, createWalletData, sendPostWalletAddAnalytics, setCreateWalletData } =
    useHotWalletCreation({
      initialMnemonic: Array.from({ length: initialMnemonicLength }, () => '')
    });

  const setMnemonic = useCallback(
    (mnemonic: string[]) => {
      const mnemonicNotEmpty = mnemonic.some((m) => m);
      providers.confirmationDialog.shouldShowDialog$.next(mnemonicNotEmpty);
      setCreateWalletData((prevState) => ({ ...prevState, mnemonic }));
    },
    [providers.confirmationDialog.shouldShowDialog$, setCreateWalletData]
  );

  const onRecoveryPhraseLengthChange: OnRecoveryPhraseLengthChange = (length) => {
    setCreateWalletData((prevState) => ({ ...prevState, mnemonic: Array.from({ length }, () => '') }));
  };

  const onNameAndPasswordChange: OnNameAndPasswordChange = ({ name, password }) => {
    setCreateWalletData((prevState) => ({ ...prevState, name, password }));
  };

  const sendHdWalletAnalyticEvent = async ({ wallet }: Wallet.CardanoWallet) => {
    const addresses = await firstValueFrom(wallet.addresses$.pipe(filter((a) => a.length > 0)));
    const hdWalletDiscovered = addresses.some((addr) => !isScriptAddress(addr) && addr.index > 0);
    if (hdWalletDiscovered) {
      await analytics.sendEventToPostHog(PostHogAction.MultiWalletRestoreHdWallet);
    }
  };

  const finalizeWalletRestoration = async () => {
    const wallet = await createWallet();
    void sendPostWalletAddAnalytics({
      extendedAccountPublicKey: wallet.source.account.extendedAccountPublicKey,
      walletAddedPostHogAction: PostHogAction.MultiWalletRestoreAdded
    });
    void sendHdWalletAnalyticEvent(wallet);
    clearSecrets();
  };

  const next = async () => {
    switch (step) {
      case WalletRestoreStep.RecoveryPhrase:
        setStep(WalletRestoreStep.Setup);
        history.push(walletRoutePaths.newWallet.restore.setup);
        break;
      case WalletRestoreStep.Setup:
        history.push(walletRoutePaths.assets);
        break;
    }
  };

  const back = () => {
    switch (step) {
      case WalletRestoreStep.RecoveryPhrase:
        providers.confirmationDialog.shouldShowDialog$.next(false);
        history.push(walletRoutePaths.newWallet.root);
        break;
      case WalletRestoreStep.Setup:
        setStep(WalletRestoreStep.RecoveryPhrase);
        history.push(walletRoutePaths.newWallet.restore.enterRecoveryPhrase);
        break;
    }
  };

  return (
    <RestoreWalletContext.Provider
      value={{
        back,
        createWalletData,
        finalizeWalletRestoration,
        next,
        onNameAndPasswordChange,
        onRecoveryPhraseLengthChange,
        setMnemonic
      }}
    >
      {children}
    </RestoreWalletContext.Provider>
  );
};
