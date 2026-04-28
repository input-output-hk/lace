import '../augmentations';

import type { SecureStoreSideEffectDependencies } from '../types';
import type { LaceInit } from '@lace-contract/module';

export const initializeSecureStoreSideEffectDependencies: LaceInit<
  SecureStoreSideEffectDependencies
> = async ({ loadModules }) => {
  const [secureStore] = await loadModules('addons.loadSecureStore');

  return {
    secureStore,
  };
};
