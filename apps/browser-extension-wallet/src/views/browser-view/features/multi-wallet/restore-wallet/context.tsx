import React, { createContext, useCallback, useContext, useState } from 'react';
import { Providers } from './types';
import { CreateWalletParams } from '@hooks';
import { PostHogAction } from '@lace/common';
import { useHistory } from 'react-router';
import { useAnalyticsContext } from '@providers';
import { filter, firstValueFrom } from 'rxjs';
import { isScriptAddress } from '@cardano-sdk/wallet';
import { walletRoutePaths } from '@routes';
import { useSoftwareWalletCreation } from '../useSoftwareWalletCreation';

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
  createWalletData: CreateWalletParams;
  createWallet: () => Promise<void>;
  setMnemonic: (mnemonic: string[]) => void;
  onNameAndPasswordChange: OnNameAndPasswordChange;
  next: () => Promise<void>;
  back: () => void;
}

// eslint-disable-next-line unicorn/no-null
const RestoreWalletContext = createContext<State>(null);

export const useRestoreWallet = (): State => {
  const state = useContext(RestoreWalletContext);
  if (state === null) throw new Error('RestoreWalletContext not defined');
  return state;
};

export const RestoreWalletProvider = ({ children, providers }: Props): React.ReactElement => {
  const history = useHistory();
  const analytics = useAnalyticsContext();
  const [step, setStep] = useState<Step>(Step.RecoveryPhrase);
  const {
    clearSecrets,
    createWallet: createSoftwareWallet,
    createWalletData,
    setCreateWalletData
  } = useSoftwareWalletCreation({
    initialMnemonic: [],
    postHogActionWalletAdded: PostHogAction.MultiWalletRestoreAdded
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

  const createWallet = async () => {
    const { wallet } = await createSoftwareWallet();
    const addresses = await firstValueFrom(wallet.addresses$.pipe(filter((a) => a.length > 0)));
    const hdWalletDiscovered = addresses.some((addr) => !isScriptAddress(addr) && addr.index > 0);
    if (hdWalletDiscovered) {
      void analytics.sendEventToPostHog(PostHogAction.MultiWalletRestoreHdWallet);
    }
  };

  const next = async () => {
    switch (step) {
      case Step.RecoveryPhrase:
        setStep(Step.Setup);
        history.push(walletRoutePaths.newWallet.restore.setup);
        break;
      case Step.Setup:
        clearSecrets();
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
        createWallet,
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
