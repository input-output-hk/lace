import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';
import { Cardano, HandleProvider, ResolveHandlesArgs } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { getBaseUrlForChain } from '@src/utils/chain';
import axiosFetchAdapter from '@shiroyasha9/axios-fetch-adapter';

const dummy = 'dummy' as Cardano.PolicyId;

export const initHandleService = async (chainName: Wallet.ChainName): Promise<HandleProvider> => {
  // eslint-disable-next-line no-console
  console.log(chainName, 'ok');

  const baseCardanoServicesUrl = getBaseUrlForChain(chainName);

  const origin = handleHttpProvider({
    adapter: axiosFetchAdapter,
    baseUrl: baseCardanoServicesUrl,
    logger: console
  });

  return {
    getPolicyIds: () => Promise.resolve([dummy]),
    healthCheck: () => Promise.resolve({ ok: true }),
    resolveHandles: async ({ handles }: ResolveHandlesArgs) => {
      // eslint-disable-next-line no-console
      console.log('1', handles, Math.random());
      /*
      check the cache
      in success case, return it
      else perform the call
         store the result in the cache
         return the result
      */

      const result = await origin.resolveHandles({ handles });

      // eslint-disable-next-line no-console
      console.log('1', handles, result);

      return Promise.resolve(result);
    }
  };
};

// createPersistentCacheStorage
