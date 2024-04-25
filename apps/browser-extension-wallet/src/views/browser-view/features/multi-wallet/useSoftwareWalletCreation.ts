import { CreateWalletParams, useWalletManager } from '@hooks';
import { PostHogAction } from '@lace/common';
import { useAnalyticsContext } from '@providers';
import { getWalletAccountsQtyString } from '@utils/get-wallet-count-string';
import { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';

type UseSoftwareWalletCreationParams = {
  initialMnemonic: string[];
  postHogActionWalletAdded: PostHogAction;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useSoftwareWalletCreation = ({
  initialMnemonic,
  postHogActionWalletAdded
}: UseSoftwareWalletCreationParams) => {
  const analytics = useAnalyticsContext();
  const walletManager = useWalletManager();
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

  const createWallet = async () => {
    const result = await walletManager.createWallet(createWalletData);
    void analytics.sendEventToPostHog(postHogActionWalletAdded, {
      // eslint-disable-next-line camelcase
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletManager.walletRepository) }
    });
    void analytics.sendMergeEvent(result.source.account.extendedAccountPublicKey);
    return result;
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
    createWalletData,
    setCreateWalletData
  };
};
