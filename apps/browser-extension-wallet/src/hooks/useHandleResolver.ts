import { getBaseKoraLabsUrlForChain } from '@src/utils/chain';
import { getChainName } from '@src/utils/get-chain-name';
import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { KoraLabsHandleProvider } from '@cardano-sdk/cardano-services-client';
import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';
import { HandleProvider } from '@cardano-sdk/core';
import { handleKoraLabsPolicyId } from '@src/utils/constants';

export const useHandleResolver = (): HandleProvider => {
  const { currentChain } = useWalletStore();
  const serverUrl = getBaseKoraLabsUrlForChain(getChainName(currentChain));

  return useMemo(
    () =>
      new KoraLabsHandleProvider({
        adapter: axiosFetchAdapter,
        serverUrl,
        policyId: handleKoraLabsPolicyId
      }),
    [serverUrl]
  );
};
