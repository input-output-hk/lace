import { useMemo } from 'react';
import { HandleProvider } from '@cardano-sdk/core';
import { getProviders } from '@src/stores/slices';

export const useHandleResolver = (): HandleProvider => {
  const { handleProvider } = getProviders();

  return useMemo(() => handleProvider, [handleProvider]);
};
