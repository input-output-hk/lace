import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { KoraLabsHandleProvider } from '@cardano-sdk/cardano-services-client';
import { ADA_HANDLE_POLICY_ID, HANDLE_SERVER_URLS } from '@src/features/ada-handle/config';

export const useHandleResolver = (): KoraLabsHandleProvider => {
  const {
    currentChain: { networkMagic }
  } = useWalletStore();

  return useMemo(() => {
    const serverUrl = HANDLE_SERVER_URLS[networkMagic as keyof typeof HANDLE_SERVER_URLS];
    return new KoraLabsHandleProvider({
      serverUrl,
      policyId: ADA_HANDLE_POLICY_ID
    });
  }, [networkMagic]);
};
