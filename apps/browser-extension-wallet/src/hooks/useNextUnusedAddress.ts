import { Cardano } from '@cardano-sdk/core';
import { useWalletStore } from '@src/stores';
import { useEffect, useState } from 'react';

export const useNextUnusedAddress = (): Cardano.PaymentAddress => {
  const [nextUnusedAddress, setNextUnusedAddress] = useState<Cardano.PaymentAddress>();
  const { inMemoryWallet } = useWalletStore();

  useEffect(() => {
    if (!inMemoryWallet) {
      return;
    }

    const getNextUnusedAddress = async () => {
      const _nextUnusedAddress = await inMemoryWallet.getNextUnusedAddress();
      setNextUnusedAddress(_nextUnusedAddress?.[0].address);
    };

    getNextUnusedAddress();
  }, [inMemoryWallet]);

  return nextUnusedAddress;
};
