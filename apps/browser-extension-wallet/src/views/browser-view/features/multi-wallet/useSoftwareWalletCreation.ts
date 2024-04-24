import { CreateWalletParams, useWalletManager } from '@hooks';
import { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';

export const useSoftwareWalletCreation = ({ initialMnemonic }: { initialMnemonic: string[] }) => {
  const { walletRepository } = useWalletManager();
  const [createWalletData, setCreateWalletData] = useState<CreateWalletParams>({
    mnemonic: initialMnemonic,
    name: '',
    password: ''
  });

  useEffect(() => {
    (async () => {
      if (createWalletData.name) return;
      const wallets = await firstValueFrom(walletRepository.wallets$);
      const name = `Wallet ${wallets.length + 1}`;
      setCreateWalletData((prevState) => ({ ...prevState, name }));
    })();
  }, [createWalletData.name, walletRepository]);

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
