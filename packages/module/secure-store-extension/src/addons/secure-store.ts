import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';

const loadSecureStore: ContextualLaceInit<
  SecureStore,
  AvailableAddons
> = () => ({
  canUseBiometricAuthentication: () => false,
  isAvailableAsync: async () => false,
  getItem: () => {
    throw new Error('Secure store not available');
  },
  setItem: () => {
    throw new Error('Secure store not available');
  },
  deleteItemAsync: () => {
    throw new Error('Secure store not available');
  },
});

export default loadSecureStore;
