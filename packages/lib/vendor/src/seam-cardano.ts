// The Cardano domain layer this seam admits (index.ts).

export {
  AddressType,
  Bip32Account,
  emip3decrypt,
  emip3encrypt,
  InMemoryKeyAgent,
  KeyPurpose,
  KeyRole,
  util,
} from '@cardano-sdk/key-management';
export type {
  GroupedAddress,
  SerializableInMemoryKeyAgentData,
} from '@cardano-sdk/key-management';
export * as Crypto from '@cardano-sdk/crypto';
// Hex-branded Ed25519 types the air-gapped SeedSigner tx flow uses to type the
// device-returned witness (public key + signature) bytes.
export type {
  Ed25519PublicKeyHex,
  Ed25519SignatureHex,
} from '@cardano-sdk/crypto';
export {
  Asset,
  Cardano,
  createTxInspector,
  Milliseconds,
  Serialization,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
export type { TransactionSummaryInspection } from '@cardano-sdk/core';
export { HexBlob, isNotNil } from '@cardano-sdk/util';

// Raw Ed25519 scalar arithmetic (`crypto_core_ed25519_scalar_reduce` +
// `crypto_scalarmult_ed25519_base_noclamp`) for the host's deterministic-nonce
// compromise fingerprint (ADR 56). The @cardano-sdk/crypto derivation this
// file exports (`Crypto`) already inlines THIS libsodium copy, so admitting it
// by name dedupes into the same chunk instead of adding an external tree.
export { default as sodium } from 'libsodium-wrappers-sumo';
