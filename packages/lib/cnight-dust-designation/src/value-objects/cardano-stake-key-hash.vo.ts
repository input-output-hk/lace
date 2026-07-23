import type { Tagged } from 'type-fest';

// =====================================================================
// CardanoStakeKeyHash — 28-byte Ed25519 key hash of the account's
// stake credential.
// =====================================================================
// Embedded in the DustMappingDatum's `c_wallet.VerificationKey` field.
// The on-chain validator's `check_auth` compares this against the
// transaction's `extra_signatories` set, so an incorrect hash here
// causes the tx to fail script validation at submit time.
//
// The dapp sources this via Lucid's `getAddressDetails(addr)
// .stakeCredential.hash`. In Lace we'll source from the existing
// Cardano account's stake credential — `Cardano.Ed25519KeyHash` is
// our equivalent of Lucid's hex string.
// =====================================================================
export type CardanoStakeKeyHash = Tagged<Uint8Array, 'CardanoStakeKeyHash'>;

export const CARDANO_KEY_HASH_LENGTH = 28;

export class CardanoStakeKeyHashError extends Error {
  public readonly code: 'invalid-length';
  public constructor(message: string) {
    super(message);
    this.name = 'CardanoStakeKeyHashError';
    this.code = 'invalid-length';
  }
}

export const CardanoStakeKeyHash = (bytes: Uint8Array): CardanoStakeKeyHash => {
  if (bytes.length !== CARDANO_KEY_HASH_LENGTH) {
    throw new CardanoStakeKeyHashError(
      `CardanoStakeKeyHash expects ${CARDANO_KEY_HASH_LENGTH} bytes, got ${bytes.length}`,
    );
  }
  return bytes as CardanoStakeKeyHash;
};

CardanoStakeKeyHash.toHex = (hash: CardanoStakeKeyHash): string =>
  Array.from(hash)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

CardanoStakeKeyHash.fromHex = (hex: string): CardanoStakeKeyHash => {
  const normalised = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalised.length !== CARDANO_KEY_HASH_LENGTH * 2) {
    throw new CardanoStakeKeyHashError(
      `CardanoStakeKeyHash hex expects ${
        CARDANO_KEY_HASH_LENGTH * 2
      } chars, got ${normalised.length}`,
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(normalised)) {
    throw new CardanoStakeKeyHashError(
      `CardanoStakeKeyHash hex contains non-hex characters: ${hex}`,
    );
  }
  const bytes = new Uint8Array(CARDANO_KEY_HASH_LENGTH);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = parseInt(normalised.slice(index * 2, index * 2 + 2), 16);
  }
  return CardanoStakeKeyHash(bytes);
};
