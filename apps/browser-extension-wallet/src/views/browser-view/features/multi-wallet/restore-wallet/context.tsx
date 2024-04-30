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
  concludeWalletAdd: () => Promise<void>;
  createWalletData: CreateWalletParams;
  next: () => Promise<void>;
  onNameAndPasswordChange: OnNameAndPasswordChange;
  setMnemonic: (mnemonic: string[]) => void;
}

// eslint-disable-next-line unicorn/no-null
const RestoreWalletContext = createContext<State>(null);

export const useRestoreWallet = (): State => {
  const state = useContext(RestoreWalletContext);
  if (state === null) throw new Error('RestoreWalletContext not defined');
  return state;
};

const mnemonicLength = 24;

export const RestoreWalletProvider = ({ children, providers }: Props): React.ReactElement => {
  const history = useHistory();
  const analytics = useAnalyticsContext();
  const [step, setStep] = useState<Step>(Step.RecoveryPhrase);
  const { clearSecrets, createWallet, createWalletData, sendPostWalletAddAnalytics, setCreateWalletData } =
    useHotWalletCreation({
      initialMnemonic: Array.from({ length: mnemonicLength }, () => '')
    });

  const setMnemonic = useCallback(
    (mnemonic: string[]) => {
      const mnemonicNotEmpty = mnemonic.some((m) => m);
      providers.confirmationDialog.shouldShowDialog$.next(mnemonicNotEmpty);
      setCreateWalletData((prevState) => ({ ...prevState, mnemonic }));
    },
    [providers.confirmationDialog.shouldShowDialog$, setCreateWalletData]
  );

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

  const concludeWalletAdd = async () => {
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
      case Step.RecoveryPhrase:
        setStep(Step.Setup);
        history.push(walletRoutePaths.newWallet.restore.setup);
        break;
      case Step.Setup:
        history.push(walletRoutePaths.assets);
        break;
    }
  };

  const back = () => {
    switch (step) {
      case Step.RecoveryPhrase:
        providers.confirmationDialog.shouldShowDialog$.next(false);
        history.push(walletRoutePaths.newWallet.root);
        break;
      case Step.Setup:
        setStep(Step.RecoveryPhrase);
        history.push(walletRoutePaths.newWallet.restore.enterRecoveryPhrase);
        break;
    }
  };

  return (
    <RestoreWalletContext.Provider
      value={{
        createWalletData,
        concludeWalletAdd,
        setMnemonic,
        onNameAndPasswordChange,
        next,
        back
      }}
    >
      {children}
    </RestoreWalletContext.Provider>
  );
};
