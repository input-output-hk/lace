import { CacheRepo, localStorageItemName, makeCacheRequest, oneDayOfCacheValidity } from './cache';

const currentDate = new Date();
jest.useFakeTimers().setSystemTime(currentDate);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prepareCacheRequestFn = (params: { getLocalStorageItem?: (key: string) => any } = {}) => {
  const getLocalStorageItem = params.getLocalStorageItem ?? jest.fn();
  const setLocalStorageItem = jest.fn();

  return {
    cacheRequest: makeCacheRequest({ getLocalStorageItem, setLocalStorageItem }),
    setLocalStorageItem
  };
};

const cacheKey = 'cacheKey';

describe('DApp Explorer data cache', () => {
  it('returns cached response', async () => {
    const expectedValue = 'cached value';
    const { cacheRequest } = prepareCacheRequestFn({
      getLocalStorageItem: jest
        .fn()
        .mockReturnValue(JSON.stringify({ [cacheKey]: { data: expectedValue, timestamp: currentDate.getTime() } }))
    });

    expect(await cacheRequest(cacheKey, () => void 0)).toEqual(expectedValue);
  });

  it('calls fetchData function if there is no particular data in cache', async () => {
    const { cacheRequest } = prepareCacheRequestFn();
    const fetchDataMock = jest.fn();
    await cacheRequest(cacheKey, fetchDataMock);

    expect(fetchDataMock).toHaveBeenCalledTimes(1);
  });

  it('calls fetchData function if cached data expired', async () => {
    const { cacheRequest } = prepareCacheRequestFn({
      getLocalStorageItem: jest.fn().mockReturnValue(
        JSON.stringify({
          [cacheKey]: { data: 'data', timestamp: currentDate.getTime() - oneDayOfCacheValidity }
        })
      )
    });
    const fetchDataMock = jest.fn();
    await cacheRequest(cacheKey, fetchDataMock);

    expect(fetchDataMock).toHaveBeenCalledTimes(1);
  });

  it('returns fetchData response', async () => {
    const { cacheRequest } = prepareCacheRequestFn();
    const expectedValue = 'expected value';
    const fetchDataMock = jest.fn().mockReturnValue(expectedValue);

    expect(await cacheRequest(cacheKey, fetchDataMock)).toEqual(expectedValue);
  });

  it('stores fetched data in cache', async () => {
    const { cacheRequest, setLocalStorageItem } = prepareCacheRequestFn();
    const response = 'response';
    const fetchDataMock = jest.fn().mockReturnValue(response);
    await cacheRequest(cacheKey, fetchDataMock);

    const expectedValue = JSON.stringify({
      [cacheKey]: {
        data: response,
        timestamp: currentDate.getTime()
      }
    });

    expect(setLocalStorageItem).toHaveBeenCalledTimes(1);
    expect(setLocalStorageItem).toHaveBeenCalledWith(localStorageItemName, expectedValue);
  });

  it('do not override cache added in the meantime', async () => {
    const initailCacheRepo: CacheRepo = {
      first: { data: 'data', timestamp: currentDate.getTime() }
    };
    const nextCacheRepo: CacheRepo = {
      ...initailCacheRepo,
      second: { data: 'data', timestamp: currentDate.getTime() }
    };

    const { cacheRequest, setLocalStorageItem } = prepareCacheRequestFn({
      getLocalStorageItem: jest
        .fn()
        .mockReturnValueOnce(JSON.stringify(initailCacheRepo))
        .mockReturnValueOnce(JSON.stringify(nextCacheRepo))
    });
    const response = 'response';
    const fetchDataMock = jest.fn().mockReturnValue(response);
    await cacheRequest(cacheKey, fetchDataMock);

    const expectedValue = JSON.stringify({
      ...nextCacheRepo,
      [cacheKey]: {
        data: response,
        timestamp: currentDate.getTime()
      }
    });

    expect(setLocalStorageItem).toHaveBeenCalledTimes(1);
    expect(setLocalStorageItem).toHaveBeenCalledWith(localStorageItemName, expectedValue);
  });
});
