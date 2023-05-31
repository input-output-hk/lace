/* eslint-disable no-magic-numbers */
import axios from 'axios';
import { renderHook, act } from '@testing-library/react-hooks';
import { usePriceFetcher } from '../usePriceFetcher';
import * as fetchHook from '../useFetchApi';
import { FetchState, FetchStatus } from '../useFetchApi';
jest.mock('axios', () => ({
  create: jest.fn(() => jest.genMockFromModule('axios'))
}));

const COINGECKO_ENDPOINT = 'https://api.coingecko.com/api/v3/simple/price';

describe('Testing usePriceFetcher hook', () => {
  const mockResult: FetchState<unknown> = {
    data: { price: 200 },
    error: undefined,
    status: FetchStatus.FETCHED
  };
  const axiosMock = axios.create();
  beforeEach(() => jest.resetAllMocks());
  afterAll(() => jest.restoreAllMocks());

  test('should fetch the price from coingecko for ADA in USD when no other coin/currency is specified', async () => {
    const fetchMock = jest.fn();
    const useFetchApiSpy = jest.spyOn(fetchHook, 'useFetchApi').mockImplementation(() => ({
      fetch: fetchMock,
      result: mockResult
    }));

    const { result } = renderHook(() => usePriceFetcher({ axiosInstance: axiosMock }));
    expect(result.current.fetch).toBeDefined();

    act(() => {
      result.current.fetch();
    });
    expect(useFetchApiSpy).toHaveBeenCalledWith({
      axiosInstance: axiosMock,
      url: `${COINGECKO_ENDPOINT}?ids=cardano&vs_currencies=usd&include_last_updated_at=true`
    });
    expect(result.current.fetch).toEqual(fetchMock);
    expect(result.current.result).toEqual(mockResult);
  });
  test('should fetch the price from coingecko for the coin/currency that are passed as parameters', async () => {
    const fetchMock = jest.fn();
    const useFetchApiSpy = jest.spyOn(fetchHook, 'useFetchApi').mockImplementation(() => ({
      fetch: fetchMock,
      result: mockResult
    }));

    const { result } = renderHook(() =>
      usePriceFetcher({ axiosInstance: axiosMock, currency: 'eur', coinId: 'bitcoin' })
    );
    expect(result.current.fetch).toBeDefined();

    act(() => {
      result.current.fetch();
    });
    expect(useFetchApiSpy).toHaveBeenCalledWith({
      axiosInstance: axiosMock,
      url: `${COINGECKO_ENDPOINT}?ids=bitcoin&vs_currencies=eur&include_last_updated_at=true`
    });
    expect(result.current.fetch).toEqual(fetchMock);
    expect(result.current.result).toEqual(mockResult);
  });
});
