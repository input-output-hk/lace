import { useEffect, useState } from 'react';
import { HANDLE_SERVER_URLS } from '@src/features/ada-handle/config';
import { KoraLabsHandleProvider } from '@src/features/ada-handle/provider';
import { useWalletStore } from '@src/stores';
import { HandleProvider } from '@src/features/ada-handle/types';

export const useHandleResolver = () => {
  const [handleResolver, setHandleResolver] = useState<HandleProvider>();
  const {
    blockchainProvider,
    currentChain: { networkMagic }
  } = useWalletStore();

  useEffect(() => {
    const getHandleResolver = () => {
      const serverUrl = HANDLE_SERVER_URLS[networkMagic as keyof typeof HANDLE_SERVER_URLS];
      const handleProvider = new KoraLabsHandleProvider({
        serverUrl,
        networkInfoProvider: blockchainProvider.networkInfoProvider
      });
      setHandleResolver(handleProvider);
    };

    getHandleResolver();
  }, [blockchainProvider, networkMagic]);

  return handleResolver;
};
