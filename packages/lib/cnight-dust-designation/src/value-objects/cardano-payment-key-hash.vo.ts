import { CARDANO_KEY_HASH_LENGTH } from './cardano-stake-key-hash.vo';

import type { Tagged } from 'type-fest';

// =====================================================================
// CardanoPaymentKeyHash — 28-byte Ed25519 key hash of the account's
// payment credential.
// =====================================================================
// Distinct nominal type from CardanoStakeKeyHash so the two can't be
// mixed in `required_signers` construction — the dapp passes both,
// the validator requires both, and a swap silently causes signature
// validation to fail at submit time without an obvious error path.
// =====================================================================
export type CardanoPaymentKeyHash = Tagged<Uint8Array, 'CardanoPaymentKeyHash'>;

// Dedicated error so a payment-key validation failure isn't reported as a
// stake-key error (which is misleading exactly where the two are mixed up).
export class CardanoPaymentKeyHashError extends Error {
  public readonly code: 'invalid-length';
  public constructor(message: string) {
    super(message);
    this.name = 'CardanoPaymentKeyHashError';
    this.code = 'invalid-length';
  }
}

export const CardanoPaymentKeyHash = (
  bytes: Uint8Array,
): CardanoPaymentKeyHash => {
  if (bytes.length !== CARDANO_KEY_HASH_LENGTH) {
    throw new CardanoPaymentKeyHashError(
      `CardanoPaymentKeyHash expects ${CARDANO_KEY_HASH_LENGTH} bytes, got ${bytes.length}`,
    );
  }
  return bytes as CardanoPaymentKeyHash;
};

CardanoPaymentKeyHash.toHex = (hash: CardanoPaymentKeyHash): string =>
  Array.from(hash)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

CardanoPaymentKeyHash.fromHex = (hex: string): CardanoPaymentKeyHash => {
  const normalised = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalised.length !== CARDANO_KEY_HASH_LENGTH * 2) {
    throw new CardanoPaymentKeyHashError(
      `CardanoPaymentKeyHash hex expects ${
        CARDANO_KEY_HASH_LENGTH * 2
      } chars, got ${normalised.length}`,
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(normalised)) {
    throw new CardanoPaymentKeyHashError(
      `CardanoPaymentKeyHash hex contains non-hex characters: ${hex}`,
    );
  }
  const bytes = new Uint8Array(CARDANO_KEY_HASH_LENGTH);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = parseInt(normalised.slice(index * 2, index * 2 + 2), 16);
  }
  return CardanoPaymentKeyHash(bytes);
};
