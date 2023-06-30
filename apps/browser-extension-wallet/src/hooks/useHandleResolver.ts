import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { Cardano, HandleProvider } from '@cardano-sdk/core';
import { ADA_HANDLE_POLICY_ID } from '@src/features/ada-handle/config';

export const HANDLE_SERVER_URLS: Record<Exclude<Cardano.NetworkMagics, Cardano.NetworkMagics.Testnet>, string> = {
  [Cardano.NetworkMagics.Mainnet]: 'https://api.handle.me',
  [Cardano.NetworkMagics.Preprod]: 'https://preprod.api.handle.me',
  [Cardano.NetworkMagics.Preview]: 'https://preview.api.handle.me'
};

export const useHandleResolver = (): HandleProvider => {
  const {
    blockchainProvider,
    currentChain: { networkMagic }
  } = useWalletStore();

  return useMemo(() => {
    const serverUrl = HANDLE_SERVER_URLS[networkMagic as keyof typeof HANDLE_SERVER_URLS];
    // ??
    return new HandleProvider({
      serverUrl,
      policyId: ADA_HANDLE_POLICY_ID
    });
  }, [blockchainProvider, networkMagic]);
};
