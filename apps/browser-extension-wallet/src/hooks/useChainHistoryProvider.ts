import { getBaseUrlForChain } from '@src/utils/chain';
import { useMemo } from 'react';
import { chainHistoryHttpProvider } from '@cardano-sdk/cardano-services-client';
import { logger } from '@lib/wallet-api-ui';
import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';

export type NetworkType = 'Mainnet' | 'Preprod' | 'Preview' | 'Sanchonet';

type UseChainHistoryProviderArgs = {
  chainName: NetworkType;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useChainHistoryProvider = ({ chainName }: UseChainHistoryProviderArgs) => {
  const baseCardanoServicesUrl = getBaseUrlForChain(chainName);

  return useMemo(
    () => chainHistoryHttpProvider({ adapter: axiosFetchAdapter, baseUrl: baseCardanoServicesUrl, logger }),
    [baseCardanoServicesUrl]
  );
};
