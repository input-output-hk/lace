import { NativeModules } from 'react-native';

import type { AvailableAddons } from '.';
import type * as Crypto from '@cardano-sdk/crypto';
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

const derivePublicKey = async (
  extendedAccountPublicKeyHex: string,
  derivationPathArray: [number, number],
): Promise<Crypto.Bip32PublicKeyHex | null> => {
  const [role, index] = derivationPathArray;
  try {
    const result = await ApolloModule.derivePublicKey(
      extendedAccountPublicKeyHex,
      role,
      index,
    );
    if (typeof result === 'string' && result.length > 0) {
      return result as Crypto.Bip32PublicKeyHex;
    }
    return null;
    // TODO: Handle error properly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null;
  }
};

const bip32Ed25519: ContextualLaceInit<
  Crypto.Bip32Ed25519,
  AvailableAddons
> = () => {
  return {
    derivePublicKeyAsync: async (
      pubKeyHex: string,
      [role, index]: [number, number],
    ) => {
      const result = await derivePublicKey(pubKeyHex, [role, index]);
      if (!result) throw new Error('derivePublicKey failed');
      return result;
    },
  } as unknown as Crypto.Bip32Ed25519;
};

export default bip32Ed25519;
