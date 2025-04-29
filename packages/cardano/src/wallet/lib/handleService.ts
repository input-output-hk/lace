import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';
import { HandleProvider, HandleResolution, ResolveHandlesArgs } from '@cardano-sdk/core';
import type { Cache } from '@cardano-sdk/util';
import { logger } from '@lace/common';
import { AxiosAdapter } from 'axios';

export interface HandleResolutionCacheItem {
  resolution: HandleResolution | null;
  timestamp: number;
}

export interface HandleServiceProps {
  adapter?: AxiosAdapter;
  baseCardanoServicesUrl: string;
  cache: Cache<HandleResolutionCacheItem>;
}

// eslint-disable-next-line no-magic-numbers
const HANDLE_RESOLUTION_CACHE_LIFETIME = 10 * 60 * 1000; // 10 minutes

export const initHandleService = (props: HandleServiceProps): HandleProvider => {
  const { adapter, baseCardanoServicesUrl, cache } = props;

  const origin = handleHttpProvider({
    adapter,
    baseUrl: baseCardanoServicesUrl,
    logger
  });

  return {
    getPolicyIds: () => origin.getPolicyIds(),
    healthCheck: () => origin.healthCheck(),
    resolveHandles: async ({ handles }: ResolveHandlesArgs) => {
      const now = Date.now();
      const threshold = now - HANDLE_RESOLUTION_CACHE_LIFETIME;
      const handlesToResolveWithRequestIndex: [string, number][] = [];

      const handlesAndCachedItems = await Promise.all(
        handles.map((handle) =>
          (async (): Promise<[string, HandleResolutionCacheItem | undefined]> => {
            const cachedItem = await cache.get(handle);

            return [handle, cachedItem];
          })()
        )
      );

      const response = handlesAndCachedItems.map(([handle, cachedItem], index): HandleResolution | null => {
        if (cachedItem && cachedItem.timestamp > threshold) return cachedItem.resolution;

        handlesToResolveWithRequestIndex.push([handle, index]);

        // eslint-disable-next-line unicorn/no-null
        return null;
      });

      if (handlesToResolveWithRequestIndex.length > 0) {
        const results = await origin.resolveHandles({
          handles: handlesToResolveWithRequestIndex.map(([handle]) => handle)
        });

        await Promise.all(
          results.map(async (result, index) => {
            const [handle, responseIndex] = handlesToResolveWithRequestIndex[index];

            await cache.set(handle, { resolution: result, timestamp: now });

            response[responseIndex] = result;
          })
        );
      }

      return response;
    }
  };
};
