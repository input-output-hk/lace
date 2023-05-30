import axios, { AxiosAdapter, AxiosInstance, AxiosRequestConfig } from 'axios';
import { IAxiosCacheAdapterOptions, setupCache } from 'axios-cache-adapter';

const DEFAULT_MAX_AGE = 900_000; // 15 minutes
const DEFAULT_CACHE_OPTIONS = {
  maxAge: DEFAULT_MAX_AGE,
  exclude: { query: false }
};

interface AxiosClientOptions {
  config?: AxiosRequestConfig;
  cache?: {
    disabled?: boolean;
    options?: IAxiosCacheAdapterOptions;
  };
}

export const createAxiosInstance = (options: AxiosClientOptions = {}): AxiosInstance => {
  const { config, cache } = options;
  const cacheDisabled = cache && cache.disabled;
  let cacheAdapter: AxiosAdapter;
  if (!cacheDisabled) {
    const cacheOptions: IAxiosCacheAdapterOptions = cache
      ? {
          ...DEFAULT_CACHE_OPTIONS,
          ...cache.options
        }
      : DEFAULT_CACHE_OPTIONS;

    cacheAdapter = setupCache(cacheOptions).adapter;
  }

  return axios.create({
    ...config,
    adapter: cacheAdapter
  });
};
