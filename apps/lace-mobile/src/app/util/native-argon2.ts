import { createNativeArgon2id, SecretBox } from '@lace-lib/core';
import { NativeModules } from 'react-native';

import { logger } from './logger';

import type { NativeArgon2id } from '@lace-lib/core';

type NativeArgon2 = {
  argon2id: NativeArgon2id;
};

const { ApolloModule } = NativeModules as {
  ApolloModule?: Partial<NativeArgon2>;
};

const nativeArgon2id = createNativeArgon2id(async (...args) => {
  if (typeof ApolloModule?.argon2id !== 'function') {
    throw new TypeError('ApolloModule.argon2id is not available');
  }
  return ApolloModule.argon2id(...args);
});

/**
 * Registers the ApolloModule Argon2id as the SecretBox key-derivation
 * implementation. Logs an error and leaves the default in place when the
 * native module is unavailable. Call before any seal or open operation.
 */
export const registerNativeArgon2id = (): void => {
  if (typeof ApolloModule?.argon2id !== 'function') {
    logger.error(
      'ApolloModule.argon2id is unavailable; SecretBox falls back to the pure-JS Argon2id, which takes minutes on Hermes',
    );
    return;
  }
  SecretBox.setArgon2idImplementation(nativeArgon2id);
};
