/* eslint-disable wrap-regex */
import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AxiosError } from 'axios';

const isFetchNetworkError = (error: unknown): boolean =>
  error instanceof TypeError && /failed to fetch|networkerror/i.test(error.message);
const isAxiosNetworkError = (error: unknown): error is AxiosError =>
  error instanceof AxiosError &&
  (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message === 'Network Error');
const isProviderNetworkError = (error: unknown): error is ProviderError =>
  error instanceof ProviderError && error.reason === ProviderFailure.ConnectionFailure;

export const isNetworkError = (error: unknown): boolean =>
  isFetchNetworkError(error) || isAxiosNetworkError(error) || isProviderNetworkError(error);
