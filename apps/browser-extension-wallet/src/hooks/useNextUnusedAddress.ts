/* eslint-disable unicorn/no-useless-undefined */
import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useEffect, useState } from 'react';

type UnusedAddressParams = {
  unusedAddresses: Wallet.WalletAddress[];
  currentUnusedAddress: Cardano.PaymentAddress;
  generateUnusedAddress: () => void;
  clearUnusedAddress: () => void;
};

export const useNextUnusedAddress = (): UnusedAddressParams => {
  const [unusedAddresses, setUnusedAddresses] = useState<Wallet.WalletAddress[]>();
  const [currentUnusedAddress, setCurrentUnusedAddress] = useState<Cardano.PaymentAddress>();
  const { inMemoryWallet } = useWalletStore();

  useEffect(() => {
    if (!inMemoryWallet) {
      return;
    }

    const fetchUnusedAddresses = async () => {
      const nextUnusedAddresses = await inMemoryWallet.getNextUnusedAddress();
      setUnusedAddresses(nextUnusedAddresses);
    };

    fetchUnusedAddresses();
  }, [inMemoryWallet]);

  const generateUnusedAddress = () => {
    setCurrentUnusedAddress(unusedAddresses?.[0].address);
  };

  const clearUnusedAddress = () => setCurrentUnusedAddress(undefined);

  return {
    unusedAddresses,
    currentUnusedAddress,
    generateUnusedAddress,
    clearUnusedAddress
  };
};
