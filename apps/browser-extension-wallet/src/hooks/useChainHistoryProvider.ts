import { getBaseUrlForChain } from '@src/utils/chain';
import { useMemo } from 'react';
import { chainHistoryHttpProvider } from '@cardano-sdk/cardano-services-client';
import { logger } from '@lib/wallet-api-ui';

type useChainHistoryProviderArgs = {
  chainName: 'Mainnet' | 'Preprod' | 'Preview';
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useChainHistoryProvider = ({ chainName }: useChainHistoryProviderArgs) => {
  const baseCardanoServicesUrl = getBaseUrlForChain(chainName);

  return useMemo(() => chainHistoryHttpProvider({ baseUrl: baseCardanoServicesUrl, logger }), [baseCardanoServicesUrl]);
};
