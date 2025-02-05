import { getBaseUrlForChain } from '@src/utils/chain';
import { getChainName } from '@src/utils/get-chain-name';
import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';
import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';
import { HandleProvider } from '@cardano-sdk/core';
import { logger } from '@lace/common';

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
