import { AxiosInstance } from 'axios';
import { useCallback, useReducer } from 'react';

export enum ActionType {
  FETCHING = 'FETCHING',
  FETCHED = 'FETCHED',
  FETCH_ERROR = 'FETCH_ERROR'
}

export enum FetchStatus {
  IDLE = 'idle',
  FETCHING = 'fetching',
  FETCHED = 'fetched',
  ERROR = 'error'
}

type FetchAction<TPayload> = {
  type: ActionType;
  payload?: TPayload | string;
};

export type FetchState<TData> = {
  status: FetchStatus;
  error: string;
  data: TData | Record<string, never>;
};

export interface FetchApiArgs {
  axiosInstance: AxiosInstance;
  url: string;
  params?: unknown;
}

export interface FetchResponse<T> {
  fetch: () => Promise<void>;
  result: FetchState<T>;
}

export const useFetchApi = <TResponse extends unknown>(args: FetchApiArgs): FetchResponse<TResponse> => {
  const { axiosInstance: axios, params, url } = args;

  const initialState: FetchState<TResponse> = {
    status: FetchStatus.IDLE,
    error: undefined,
    data: {}
  };

  const [result, dispatch] = useReducer((state: FetchState<TResponse>, action: FetchAction<TResponse>) => {
    switch (action.type) {
      case ActionType.FETCHING:
        return { ...initialState, status: FetchStatus.FETCHING } as FetchState<TResponse>;
      case ActionType.FETCHED:
        return { ...initialState, status: FetchStatus.FETCHED, data: action.payload } as FetchState<TResponse>;
      case ActionType.FETCH_ERROR:
        return { ...initialState, status: FetchStatus.ERROR, error: action.payload } as FetchState<TResponse>;
      default:
        return state;
    }
  }, initialState);

  const fetch = useCallback(async () => {
    dispatch({ type: ActionType.FETCHING });
    try {
      const response = await axios.get(url, params);
      const { data } = response;
      dispatch({ type: ActionType.FETCHED, payload: data });
    } catch (error) {
      dispatch({ type: ActionType.FETCH_ERROR, payload: error.message });
    }
  }, [axios, params, url]);

  return { fetch, result };
};
