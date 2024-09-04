/* eslint-disable unicorn/no-useless-undefined */
import { Cardano } from '@cardano-sdk/core';
import { useWalletStore } from '@src/stores';
import { useState } from 'react';

type UnusedAddressParams = {
  nextUnusedAddress: Cardano.PaymentAddress;
  generateUnusedAddress: () => Promise<void>;
  clearUnusedAddress: () => void;
};

export const useNextUnusedAddress = (): UnusedAddressParams => {
  const [nextUnusedAddress, setNextUnusedAddress] = useState<Cardano.PaymentAddress>();

  const { inMemoryWallet } = useWalletStore();

  const generateUnusedAddress = async () => {
    if (!inMemoryWallet) {
      return;
    }

    const _nextUnusedAddress = await inMemoryWallet.getNextUnusedAddress();
    setNextUnusedAddress(_nextUnusedAddress?.[0].address);
  };

  const clearUnusedAddress = () => setNextUnusedAddress(undefined);

  return { nextUnusedAddress, generateUnusedAddress, clearUnusedAddress };
};
