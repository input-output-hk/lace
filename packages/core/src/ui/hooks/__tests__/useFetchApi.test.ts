/* eslint-disable no-magic-numbers */
import axios, { AxiosResponse, AxiosResponseHeaders } from 'axios';
import { renderHook, act } from '@testing-library/react-hooks';
import { useFetchApi } from '../useFetchApi';

jest.mock('axios', () => ({
  create: jest.fn(() => jest.genMockFromModule('axios'))
}));

describe('Testing useFetchApi hook', () => {
  const mockResponse: AxiosResponse = {
    data: { test: 'test' },
    status: 200,
    statusText: 'OK',
    config: {
      headers: {} as AxiosResponseHeaders
    },
    headers: {}
  };
  test('should fetch the data from the api and set the status to idle, fetching and fetched in order', async () => {
    const axiosMock = axios.create();
    (axiosMock.get as jest.Mock).mockResolvedValue(mockResponse);
    const { result, waitFor } = renderHook(() => useFetchApi({ axiosInstance: axiosMock, url: 'test' }));
    expect(result.current.fetch).toBeDefined();

    act(() => {
      result.current.fetch();
    });
    await waitFor(() => {
      expect(result.current.result.status).toEqual('fetched');
      expect(result.current.result.data).toEqual(mockResponse.data);
      expect(result.current.result.error).toBeUndefined();
    });
    expect(axiosMock.get).toHaveBeenCalled();
    const states = result.all.map((res) => ('result' in res ? res.result : undefined));
    expect(states).toHaveLength(3);
    expect(states[0]).toEqual({
      status: 'idle',
      data: {},
      error: undefined
    });
    expect(states[1]).toEqual({
      status: 'fetching',
      data: {},
      error: undefined
    });
    expect(states[2]).toEqual(result.current.result);
  });

  test('should try fetching the data and set the status to idle, fetching and error if the api fails', async () => {
    const axiosMock = axios.create();
    (axiosMock.get as jest.Mock).mockRejectedValue(new Error('api error'));
    const { result, waitFor } = renderHook(() => useFetchApi({ axiosInstance: axiosMock, url: 'test' }));
    expect(result.current.fetch).toBeDefined();

    act(() => {
      result.current.fetch();
    });
    await waitFor(() => {
      expect(result.current.result.status).toEqual('error');
      expect(result.current.result.data).toEqual({});
      expect(result.current.result.error).toEqual('api error');
    });
    expect(axiosMock.get).toHaveBeenCalled();
    const states = result.all.map((res) => ('result' in res ? res.result : undefined));
    expect(states).toHaveLength(3);
    expect(states[0]).toEqual({
      status: 'idle',
      data: {},
      error: undefined
    });
    expect(states[1]).toEqual({
      status: 'fetching',
      data: {},
      error: undefined
    });
    expect(states[2]).toEqual(result.current.result);
  });
});
