import { NativeModules } from 'react-native';

import type { AvailableAddons } from '.';
import type * as Crypto from '@cardano-sdk/crypto';
import type { HexBlob } from '@cardano-sdk/util';
import type { ContextualLaceInit } from '@lace-contract/module';

const { ApolloModule } = NativeModules as {
  ApolloModule: {
    derivePublicKey(
      extendedAccountPublicKeyHex: string,
      role: number,
      index: number,
    ): Promise<string>;
    blake2bHash(inputHex: string, outLength: number): Promise<string>;
    derivePublicKeySync(
      extendedAccountPublicKeyHex: Crypto.Bip32PublicKeyHex,
      derivationIndices: Crypto.BIP32Path,
    ): Crypto.Bip32PublicKeyHex;
    blake2bHashSync(inputHex: string, outLength: number): string;
  };
};

const blake2bHash = async <T extends HexBlob>(
  message: HexBlob,
  outputLengthBytes: number,
): Promise<T> => {
  try {
    const result = await ApolloModule.blake2bHash(message, outputLengthBytes);
    if (typeof result === 'string' && result.length > 0) {
      return result as T;
    }
    throw new Error('Invalid hash result');
  } catch (error) {
    throw error;
  }
};

const blake2b: ContextualLaceInit<Crypto.Blake2b, AvailableAddons> = () => {
  return {
    hashAsync: async <T extends HexBlob>(
      inputHex: HexBlob,
      outLength: number,
    ): Promise<T> => {
      const result = await blake2bHash<T>(inputHex, outLength);
      if (!result) throw new Error('blake2bHash failed');
      return result;
    },
    hash: () => {}, // TODO: Check if its needed
  };
};

export default blake2b;
