import { Cardano, Serialization } from '@cardano-sdk/core';
import { Ed25519PublicKeyHex, Ed25519SignatureHex } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import {
  assertTransactionFullySigned,
  mergeVkeyWitnesses,
  verifyVkeyWitnesses,
} from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';

import {
  CardanoCustodyBuildFailedError,
  CardanoCustodyWitnessError,
} from './cardano-custody-errors';

import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { CardanoVkeyWitness } from '@lace-contract/cardano-context';

const VKEY_WITNESSES_KEY = 0n;
const ED25519_PUBLIC_KEY_HEX_LENGTH = 64;
const ED25519_SIGNATURE_HEX_LENGTH = 128;
const HEX_PATTERN = /^(?:[\da-f]{2})+$/i;

/**
 * The vkey witnesses of transaction witness set CBOR that holds vkey
 * witnesses and nothing else, or undefined for anything else: other witness
 * fields, bootstrap witnesses, trailing bytes, or no vkey at all.
 */
export const readVkeyOnlyWitnessSet = (
  witnessSet: string,
): CardanoVkeyWitness[] | undefined => {
  if (!HEX_PATTERN.test(witnessSet)) return undefined;
  try {
    const reader = new Serialization.CborReader(
      HexBlob(witnessSet.toLowerCase()),
    );
    if (reader.readStartMap() !== 1) return undefined;
    if (reader.readInt() !== VKEY_WITNESSES_KEY) return undefined;
    const vkeys = Serialization.CborSet.fromCbor(
      HexBlob.fromBytes(reader.readEncodedValue()),
      Serialization.VkeyWitness.fromCbor,
    ).values();
    reader.readEndMap();
    if (reader.getBytesRemaining() !== 0 || vkeys.length === 0) {
      return undefined;
    }
    return vkeys.map(witness => ({
      vkey: witness.vkey(),
      signature: witness.signature(),
    }));
  } catch {
    return undefined;
  }
};

/** Whether `witness` has the sizes of an Ed25519 key and signature in hex. */
export const isWellFormedVkeyWitness = (
  witness: unknown,
): witness is CardanoVkeyWitness =>
  typeof witness === 'object' &&
  witness !== null &&
  'vkey' in witness &&
  'signature' in witness &&
  typeof witness.vkey === 'string' &&
  typeof witness.signature === 'string' &&
  witness.vkey.length === ED25519_PUBLIC_KEY_HEX_LENGTH &&
  witness.signature.length === ED25519_SIGNATURE_HEX_LENGTH &&
  HEX_PATTERN.test(witness.vkey) &&
  HEX_PATTERN.test(witness.signature);

/** Witness set CBOR holding exactly `witnesses`, as signers answer. */
export const vkeyWitnessSetOf = (
  witnesses: readonly CardanoVkeyWitness[],
): HexBlob => {
  const witnessSet = new Serialization.TransactionWitnessSet();
  witnessSet.setVkeys(
    Serialization.CborSet.fromCore(
      witnesses.map(
        ({ vkey, signature }) =>
          [
            Ed25519PublicKeyHex(vkey.toLowerCase()),
            Ed25519SignatureHex(signature.toLowerCase()),
          ] as const,
      ),
      Serialization.VkeyWitness.fromCore,
    ),
  );
  return witnessSet.toCbor();
};

/**
 * The one witness a signer's answer must hold: a valid signature over
 * `bodyHash` by the key whose hash is `keyHash`. Any other key, an invalid
 * signature or a witness set holding anything but vkeys refuses the answer,
 * because an unpriced witness would push the signed transaction past its
 * fee.
 *
 * @throws {@link CardanoCustodyWitnessError}
 */
export const expectSignerWitness = async ({
  signer,
  witnessSet,
  bodyHash,
  keyHash,
}: {
  signer: 'device' | 'sponsor';
  witnessSet: string;
  bodyHash: Cardano.TransactionId;
  keyHash: Ed25519KeyHashHex;
}): Promise<CardanoVkeyWitness> => {
  const witnesses = readVkeyOnlyWitnessSet(witnessSet);
  if (!witnesses) throw new CardanoCustodyWitnessError(signer, 'malformed');
  const { valid, invalid } = await verifyVkeyWitnesses(bodyHash, witnesses);
  if (invalid.length > 0) {
    throw new CardanoCustodyWitnessError(signer, 'invalid-signature');
  }
  const witness = valid.get(keyHash.toLowerCase() as Ed25519KeyHashHex);
  if (!witness || valid.size > 1) {
    throw new CardanoCustodyWitnessError(signer, 'unexpected-key');
  }
  return witness;
};

/**
 * The payment key hash of a key-hash payment address, as its owner signs
 * with; undefined for a script or Byron address.
 */
export const paymentKeyHashOf = (
  address: Cardano.PaymentAddress,
): Ed25519KeyHashHex | undefined => {
  const credential =
    Cardano.Address.fromString(address)?.getProps().paymentPart;
  return credential?.type === Cardano.CredentialType.KeyHash
    ? (credential.hash as unknown as Ed25519KeyHashHex)
    : undefined;
};

/**
 * Whether the signed transaction's key witnesses are exactly `witnesses`:
 * the signers its fee was priced for, and no bootstrap witness.
 */
const holdsOnlyPricedSigners = (
  signed: Serialization.Transaction,
  witnesses: readonly CardanoVkeyWitness[],
): boolean => {
  const expected = new Set(witnesses.map(({ vkey }) => vkey.toLowerCase()));
  const vkeys = signed.witnessSet().vkeys()?.values() ?? [];
  return (
    (signed.witnessSet().bootstraps()?.size() ?? 0) === 0 &&
    vkeys.length === expected.size &&
    vkeys.every(witness => expected.has(witness.vkey().toLowerCase()))
  );
};

/**
 * Adds verified witnesses to the unsigned transaction at the CBOR layer, so
 * the body, redeemers and datums keep their bytes, and checks that the
 * signed transaction holds the key witnesses of exactly the priced signers
 * and that every key the transaction requires has signed.
 *
 * @throws {@link CardanoCustodyBuildFailedError} With `build-failed` when the
 *   transaction already held other key witnesses.
 * @throws {@link TransactionUnderSignedError} When a required key has not signed.
 */
export const assembleCustodyTransaction = ({
  transaction,
  witnesses,
  resolvedInputs,
}: {
  transaction: string;
  witnesses: readonly CardanoVkeyWitness[];
  resolvedInputs: Cardano.Utxo[];
}): HexBytes => {
  const signed = mergeVkeyWitnesses(HexBytes(transaction), witnesses);
  const signedTransaction = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(signed),
  );
  if (!holdsOnlyPricedSigners(signedTransaction, witnesses)) {
    throw new CardanoCustodyBuildFailedError({
      code: 'build-failed',
      message: 'The transaction holds key witnesses its fee does not price',
    });
  }
  assertTransactionFullySigned(signedTransaction, resolvedInputs);
  return signed;
};
