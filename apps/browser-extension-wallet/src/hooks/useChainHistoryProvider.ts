import { getBaseUrlForChain } from '@src/utils/chain';
import { useMemo } from 'react';
import { chainHistoryHttpProvider } from '@cardano-sdk/cardano-services-client';
import { logger } from '@lib/wallet-api-ui';
import axiosFetchAdapter from '@vespaiach/axios-fetch-adapter';

export type NetworkType = 'Mainnet' | 'Preprod' | 'Preview' | 'Sanchonet';

type UseChainHistoryProviderArgs = {
  chainName: NetworkType;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useChainHistoryProvider = ({ chainName }: UseChainHistoryProviderArgs) => {
  const baseCardanoServicesUrl = getBaseUrlForChain(chainName);

  return useMemo(
    () =>
      chainHistoryHttpProvider({
        adapter: axiosFetchAdapter,
        baseUrl: baseCardanoServicesUrl,
        logger,
        // TODO: remove apiVersion override once the back-ends are all updated to P2P (Node 8.9.2)
        apiVersion: '3.0.1'
      }),
    [baseCardanoServicesUrl]
  );
};
