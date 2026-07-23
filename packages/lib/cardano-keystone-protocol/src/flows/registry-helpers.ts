import { CryptoKeypath, PathComponent } from '@keystonehq/bc-ur-registry';

import { UnexpectedUrTypeError } from '../errors';
import { HARDENED_OFFSET } from '../value-objects/derivation-path.vo';

import type { DerivationPath } from '../value-objects/derivation-path.vo';
import type { UrResult } from '@lace-lib/ur-transport';

/**
 * Minimal structural shape of a registry item. The base and Cardano registry
 * packages each bundle their own RegistryItem class, so a structural type is
 * required to accept items from both.
 */
export interface CborRegistryItem {
  toCBOR: () => Uint8Array;
}

/**
 * Serialises a registry item to its untagged CBOR bytes. The registry type is
 * carried by the UR type string, not by an outer CBOR tag.
 */
export const toCborBytes = (item: CborRegistryItem): Uint8Array =>
  Uint8Array.from(item.toCBOR());

/** Asserts that a reassembled UR carries the expected UR type. */
export const assertUrType = (expected: string, result: UrResult): void => {
  if (result.urType !== expected) {
    throw new UnexpectedUrTypeError(expected, result.urType);
  }
};

/** Converts a derivation path to a crypto-keypath registry item. */
export const toKeypath = (path: DerivationPath): CryptoKeypath =>
  new CryptoKeypath(
    path.map(
      component =>
        new PathComponent({
          index:
            component >= HARDENED_OFFSET
              ? component - HARDENED_OFFSET
              : component,
          hardened: component >= HARDENED_OFFSET,
        }),
    ),
  );
