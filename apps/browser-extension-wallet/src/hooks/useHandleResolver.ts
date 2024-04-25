import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';
import { HandleProvider } from '@cardano-sdk/core';
import { HANDLE_SERVER_URLS } from '@src/features/ada-handle/config';
import { logger } from '@lib/wallet-api-ui';

export const useHandleResolver = (): HandleProvider => {
  const {
    currentChain: { networkMagic }
  } = useWalletStore();

  return useMemo(() => {
    const serverUrl = HANDLE_SERVER_URLS[networkMagic as keyof typeof HANDLE_SERVER_URLS];
    return handleHttpProvider({
      baseUrl: serverUrl,
      logger
    });
  }, [networkMagic]);
};
