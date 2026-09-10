import { Serialization } from '@cardano-sdk/core';

import type { Ed25519PublicKeyHex } from '@cardano-sdk/crypto';

/**
 * Sets the vkey witnesses on a transaction witness set from a collection of
 * `[publicKey, signature]` pairs. Every Cardano transaction signer builds its own
 * witness collection (a single key agent's signatures map, device witnesses, or a
 * map merged with the transaction's pre-existing witnesses) and does its own tx
 * rebuild, but this CBOR vkey-set construction is identical across all of them.
 * Callers pass the pairs they assembled and keep their own surrounding logic.
 */
export const applyVkeyWitnesses = (
  witnessSet: Serialization.TransactionWitnessSet,
  vkeyWitnesses: Iterable<readonly [Ed25519PublicKeyHex, string]>,
): void => {
  witnessSet.setVkeys(
    Serialization.CborSet.fromCore(
      [...vkeyWitnesses] as Parameters<
        typeof Serialization.VkeyWitness.fromCore
      >[0][],
      Serialization.VkeyWitness.fromCore,
    ),
  );
};
