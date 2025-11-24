import { logger } from '@lace/common';

type CacheEntry<Data> = {
  data: Data;
  timestamp: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CacheRepo = Record<string, CacheEntry<any>>;

export const localStorageItemName = 'dapp-explorer-data-cache';
// eslint-disable-next-line no-magic-numbers
export const oneDayOfCacheValidity = 1000 * 60 * 60 * 24;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isCacheStillValid = (cacheEntry: CacheEntry<any> | undefined): cacheEntry is CacheEntry<any> =>
  !!cacheEntry && new Date(cacheEntry.timestamp + oneDayOfCacheValidity) > new Date();

type MakeCacheRequestParams = {
  getLocalStorageItem: (key: string) => string;
  setLocalStorageItem: (key: string, value: string) => void;
};

const parseRawCacheRepo = (rawCacheRepo: string) => {
  let cacheRepo: CacheRepo = {};
  try {
    if (rawCacheRepo) {
      cacheRepo = JSON.parse(rawCacheRepo);
    }
  } catch (error) {
    logger.error('Failed to parse dapp explorer data cache', error);
  }
  return cacheRepo;
};

export const makeCacheRequest =
  ({ getLocalStorageItem, setLocalStorageItem }: MakeCacheRequestParams) =>
  async <Response>(cacheKey: string, fetchData: () => Promise<Response>): Promise<Response> => {
    let cacheRepo = parseRawCacheRepo(getLocalStorageItem(localStorageItemName));
    const cacheEntry: CacheEntry<Response> | undefined = cacheRepo[cacheKey];
    if (isCacheStillValid(cacheEntry)) return cacheEntry.data;

    const response = await fetchData();
    const newCacheEntry: CacheEntry<Response> = {
      data: response,
      timestamp: Date.now()
    };

    cacheRepo = parseRawCacheRepo(getLocalStorageItem(localStorageItemName));
    cacheRepo[cacheKey] = newCacheEntry;
    setLocalStorageItem(localStorageItemName, JSON.stringify(cacheRepo));

    return response;
  };

export const cacheRequest = makeCacheRequest({
  getLocalStorageItem: (key) => window.localStorage.getItem(key),
  setLocalStorageItem: (key, value) => window.localStorage.setItem(key, value)
});
