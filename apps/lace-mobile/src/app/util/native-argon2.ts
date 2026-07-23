import { ByteArray, HexBytes, SecretBox } from '@lace-lib/core';
import { NativeModules } from 'react-native';

import { logger } from './logger';

import type { Argon2idImplementation } from '@lace-lib/core';

type NativeArgon2 = {
  argon2id(
    passwordHex: string,
    saltHex: string,
    memoryKb: number,
    iterations: number,
    parallelism: number,
    outLength: number,
  ): Promise<string>;
};

const { ApolloModule } = NativeModules as {
  ApolloModule?: Partial<NativeArgon2>;
};

const nativeArgon2id: Argon2idImplementation = async (
  password,
  salt,
  { m, t, p, dkLen },
) => {
  if (typeof ApolloModule?.argon2id !== 'function') {
    throw new TypeError('ApolloModule.argon2id is not available');
  }
  const derivedHex = await ApolloModule.argon2id(
    HexBytes.fromByteArray(password),
    HexBytes.fromByteArray(salt),
    m,
    t,
    p,
    dkLen,
  );
  if (typeof derivedHex !== 'string' || derivedHex.length !== dkLen * 2) {
    throw new Error(
      `Native argon2id returned an invalid result: expected ${dkLen} bytes`,
    );
  }
  return ByteArray.fromHex(HexBytes(derivedHex));
};

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
