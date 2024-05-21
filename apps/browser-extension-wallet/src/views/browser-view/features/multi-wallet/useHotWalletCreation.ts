import { Bip32PublicKeyHex } from '@cardano-sdk/crypto/dist/esm';
import { CreateWalletParams, useWalletManager } from '@hooks';
import { PostHogAction } from '@lace/common';
import { useAnalyticsContext } from '@providers';
import { getWalletAccountsQtyString } from '@utils/get-wallet-count-string';
import { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';
import { useWalletOnboarding } from './walletOnboardingContext';

type UseSoftwareWalletCreationParams = {
  initialMnemonic: string[];
};

type SendPostWalletAddAnalyticsParams = {
  extendedAccountPublicKey: Bip32PublicKeyHex;
  walletAddedPostHogAction: PostHogAction;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useHotWalletCreation = ({ initialMnemonic }: UseSoftwareWalletCreationParams) => {
  const analytics = useAnalyticsContext();
  const walletManager = useWalletManager();
  const { aliasEventRequired } = useWalletOnboarding();
  const [createWalletData, setCreateWalletData] = useState<CreateWalletParams>({
    mnemonic: initialMnemonic,
    name: '',
    password: ''
  });

  useEffect(() => {
    (async () => {
      if (createWalletData.name) return;
      const wallets = await firstValueFrom(walletManager.walletRepository.wallets$);
      const name = `Wallet ${wallets.length + 1}`;
      setCreateWalletData((prevState) => ({ ...prevState, name }));
    })();
  }, [createWalletData.name, walletManager.walletRepository]);

  const createWallet = () => walletManager.createWallet(createWalletData);

  const sendPostWalletAddAnalytics = async ({
    extendedAccountPublicKey,
    walletAddedPostHogAction
  }: SendPostWalletAddAnalyticsParams) => {
    await analytics.sendEventToPostHog(walletAddedPostHogAction, {
      // eslint-disable-next-line camelcase
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletManager.walletRepository) }
    });
    await analytics.sendMergeEvent(extendedAccountPublicKey);
    if (aliasEventRequired) {
      await analytics.sendAliasEvent();
    }
  };

  const clearSecrets = () => {
    createWalletData.password = '';
    for (let i = 0; i < createWalletData.mnemonic.length; i++) {
      createWalletData.mnemonic[i] = '';
    }
    setCreateWalletData((prevState) => ({
      ...prevState,
      password: '',
      mnemonic: []
    }));
  };

  return {
    clearSecrets,
    createWallet,
    sendPostWalletAddAnalytics,
    createWalletData,
    setCreateWalletData
  };
};
