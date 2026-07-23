import type { Tagged } from 'type-fest';

/** Length in hex characters of a master fingerprint (4 bytes). */
export const MASTER_FINGERPRINT_HEX_LENGTH = 8;

/**
 * Master fingerprint (xfp): the 4-byte BTC secp256k1 BIP-32 fingerprint of a
 * seed, stored as an 8-character lowercase hex string. Persisted on Cardano
 * hardware accounts (e.g. the Seed Signer) so signing requests can target the
 * device seed that owns the account keys.
 */
export type MasterFingerprint = Tagged<string, 'MasterFingerprint'>;

const HEX_PATTERN = /^[0-9a-f]{8}$/;

export const MasterFingerprint = (hex: string): MasterFingerprint => {
  const normalized = hex.toLowerCase();
  if (!HEX_PATTERN.test(normalized)) {
    throw new Error(
      `master fingerprint must be ${MASTER_FINGERPRINT_HEX_LENGTH} hex characters, got "${hex}"`,
    );
  }
  return normalized as MasterFingerprint;
};
