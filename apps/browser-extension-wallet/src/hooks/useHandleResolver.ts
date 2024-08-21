import { getBaseUrlForChain } from '@src/utils/chain';
import { getChainName } from '@src/utils/get-chain-name';
import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';
import { logger } from '@lib/wallet-api-ui';
import axiosFetchAdapter from '@vespaiach/axios-fetch-adapter';
import { HandleProvider } from '@cardano-sdk/core';

export const useHandleResolver = (): HandleProvider => {
  const { currentChain } = useWalletStore();
  const baseCardanoServicesUrl = getBaseUrlForChain(getChainName(currentChain));

  return useMemo(
    () =>
      handleHttpProvider({
        adapter: axiosFetchAdapter,
        baseUrl: baseCardanoServicesUrl,
        logger
      }),
    [baseCardanoServicesUrl]
  );
};
