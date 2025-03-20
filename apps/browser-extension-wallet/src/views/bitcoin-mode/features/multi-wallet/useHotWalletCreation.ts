import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { CreateWalletParams, useWalletManager } from '@hooks';
import { useAnalyticsContext } from '@providers';
import { PostHogMultiWalletAction, PostHogOnboardingAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { getWalletAccountsQtyString } from '@utils/get-wallet-count-string';
import { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';
import { useWalletOnboarding } from './walletOnboardingContext';
import { Bitcoin } from '@lace/bitcoin';

type UseSoftwareWalletCreationParams = {
  initialMnemonic: string[];
};

type SendPostWalletAddAnalyticsParams = {
  extendedAccountPublicKey: Bip32PublicKeyHex;
  postHogActionHdWallet?: PostHogMultiWalletAction | PostHogOnboardingAction;
  postHogActionWalletAdded: PostHogMultiWalletAction | PostHogOnboardingAction;
  wallet?: Bitcoin.BitcoinWallet;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useHotWalletCreation = ({ initialMnemonic }: UseSoftwareWalletCreationParams) => {
  const analytics = useAnalyticsContext();
  const walletManager = useWalletManager();
  const { aliasEventRequired, mergeEventRequired } = useWalletOnboarding();
  const [createWalletData, setCreateWalletData] = useState<CreateWalletParams>({
    mnemonic: initialMnemonic,
    name: ''
  });

  useEffect(() => {
    (async () => {
      if (createWalletData.name) return;
      const wallets = await firstValueFrom(walletManager.walletRepository.wallets$);
      const name = `Wallet ${wallets.length + 1}`;

      setCreateWalletData((prevState) => ({ ...prevState, name }));
    })();
  }, [createWalletData.name, walletManager.walletRepository, setCreateWalletData]);

  const createWallet = async (newData: Partial<CreateWalletParams>) =>
    await walletManager.createBitcoinWallet({
      ...createWalletData,
      ...newData
    });

  const sendPostWalletAddAnalytics = async ({
    extendedAccountPublicKey,
    postHogActionWalletAdded
  }: SendPostWalletAddAnalyticsParams) => {
    await analytics.sendEventToPostHog(postHogActionWalletAdded, {
      // eslint-disable-next-line camelcase
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletManager.walletRepository) }
    });

    if (aliasEventRequired) {
      await analytics.sendAliasEvent();
    }

    if (mergeEventRequired) {
      await analytics.sendMergeEvent(extendedAccountPublicKey);
    }
  };

  return {
    createWallet,
    sendPostWalletAddAnalytics,
    createWalletData,
    setCreateWalletData
  };
};
