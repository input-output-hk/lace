import { ProviderError, ProviderFailure } from '@cardano-sdk/core';

export const isNetworkError = (error: unknown): boolean =>
  (error instanceof ProviderError && error.reason === ProviderFailure.ConnectionFailure) ||
  (error instanceof TypeError && error.message === 'Failed to fetch');
