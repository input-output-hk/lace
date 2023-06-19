import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { KoraLabsHandleProvider } from '@cardano-sdk/cardano-services-client';
import { Wallet } from '@lace/cardano';
import { Cardano } from '@cardano-sdk/core';

export const HANDLE_SERVER_URLS: Record<Exclude<Cardano.NetworkMagics, Cardano.NetworkMagics.Testnet>, string> = {
  [Cardano.NetworkMagics.Mainnet]: 'https://api.handle.me',
  [Cardano.NetworkMagics.Preprod]: 'https://preprod.api.handle.me',
  [Cardano.NetworkMagics.Preview]: 'https://preview.api.handle.me'
};

// TODO: use export after receive flow is merged
const ADA_HANDLE_POLICY_ID = Wallet.Cardano.PolicyId('f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a');

export const useHandleResolver = (): KoraLabsHandleProvider => {
  const {
    blockchainProvider,
    currentChain: { networkMagic }
  } = useWalletStore();

  return useMemo(() => {
    const serverUrl = HANDLE_SERVER_URLS[networkMagic as keyof typeof HANDLE_SERVER_URLS];
    return new KoraLabsHandleProvider({
      serverUrl,
      networkInfoProvider: blockchainProvider.networkInfoProvider,
      policyId: ADA_HANDLE_POLICY_ID
    });
  }, [blockchainProvider, networkMagic]);
};
