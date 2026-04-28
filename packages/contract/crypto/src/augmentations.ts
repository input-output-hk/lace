import type { Bip32Ed25519, Blake2b } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';

declare module '@lace-contract/module' {
  interface LaceAddons {
    readonly bip32Ed25519: DynamicallyLoadedInit<Bip32Ed25519>;
    readonly blake2b: DynamicallyLoadedInit<Blake2b>;
  }
}
