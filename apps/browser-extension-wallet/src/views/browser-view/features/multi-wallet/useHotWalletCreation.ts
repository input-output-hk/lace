import { CreateWalletParams, useWalletManager } from '@hooks';
import { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';

type UseSoftwareWalletCreationParams = {
  initialMnemonic: string[];
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useHotWalletCreation = ({ initialMnemonic }: UseSoftwareWalletCreationParams) => {
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
    createWalletData,
    setCreateWalletData
  };
};
