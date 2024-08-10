import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { CreateWalletParams, useWalletManager } from '@hooks';
import { Wallet } from '@lace/cardano';
import { useAnalyticsContext } from '@providers';
import { PostHogMultiWalletAction, PostHogOnboardingAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { getWalletAccountsQtyString } from '@utils/get-wallet-count-string';
import { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';
import { isHdWallet } from './isHdWallet';
import { useWalletOnboarding } from './walletOnboardingContext';

type UseSoftwareWalletCreationParams = {
  initialMnemonic: string[];
};

type SendPostWalletAddAnalyticsParams = {
  extendedAccountPublicKey: Bip32PublicKeyHex;
  postHogActionHdWallet?: PostHogMultiWalletAction | PostHogOnboardingAction;
  postHogActionWalletAdded: PostHogMultiWalletAction | PostHogOnboardingAction;
  wallet?: Wallet.ObservableWallet;
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
  }, [createWalletData.name, walletManager.walletRepository]);

  const createWallet = () => walletManager.createWallet(createWalletData);

  const sendPostWalletAddAnalytics = async ({
    extendedAccountPublicKey,
    postHogActionHdWallet,
    postHogActionWalletAdded,
    wallet
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

    if (postHogActionHdWallet && wallet && (await isHdWallet(wallet))) {
      await analytics.sendEventToPostHog(postHogActionHdWallet);
    }
  };

  return {
    createWallet,
    sendPostWalletAddAnalytics,
    createWalletData,
    setCreateWalletData
  };
};
