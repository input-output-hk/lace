import type * as secureStore from 'expo-secure-store';

export type SecureStore = Pick<
  typeof secureStore,
  | 'canUseBiometricAuthentication'
  | 'deleteItemAsync'
  | 'getItem'
  | 'isAvailableAsync'
  | 'setItem'
>;

export type SecureStoreSideEffectDependencies = {
  secureStore: SecureStore;
};
