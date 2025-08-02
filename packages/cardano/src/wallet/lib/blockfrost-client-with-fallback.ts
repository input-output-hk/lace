/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockfrostClientConfig, RateLimiter, BlockfrostClient } from '@cardano-sdk/cardano-services-client';

type FallbackClientConfig = {
  customBlockfrostUrl?: string;
  rateLimiter: RateLimiter;
  config: BlockfrostClientConfig;
};

export const createFallbackBlockfrostClient = ({
  customBlockfrostUrl,
  config,
  rateLimiter
}: FallbackClientConfig): BlockfrostClient => {
  const primary = new BlockfrostClient(
    {
      ...config,
      baseUrl: customBlockfrostUrl ?? config.baseUrl
    },
    { rateLimiter }
  );

  const fallback = customBlockfrostUrl
    ? new BlockfrostClient(
        {
          ...config,
          baseUrl: config.baseUrl
        },
        { rateLimiter }
      )
    : null;

  const originalRequest = primary.request.bind(primary);

  primary.request = async <T>(endpoint: string, requestInit?: RequestInit): Promise<T> => {
    try {
      return await originalRequest(endpoint, requestInit);
    } catch (error: any) {
      // eslint-disable-next-line no-magic-numbers
      if (!fallback || error?.response?.status === 404) {
        throw error;
      }

      console.warn(
        `[BlockfrostFallback] Primary (${customBlockfrostUrl}) failed: ${error?.message}. Retrying with base (${config.baseUrl})`
      );

      return fallback.request<T>(endpoint, requestInit);
    }
  };

  return primary;
};
