/**
 * `@lace-lib/vendor` — the single re-export seam over the trusted external SDK
 * surface ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 *
 * The privileged host closure (ADR 37) depends on `@cardano-sdk/*` **only**
 * through this lib, which it vendors as a committed,
 * **no-minify built bundle** (`npm run build` → `dist/`, the @cardano-sdk surface inlined)
 * so an SDK bump shows up as one reviewable diff of the actual production code — the audit
 * chokepoint. Workspace members resolve this `src` directly; the privileged
 * closure consumes the built bundle (ADR 37). cardano-js-sdk is Lace-maintained and in
 * maintenance mode (rare updates) ⇒ very low supply-chain risk, which is what justifies
 * depending on it directly rather than re-deriving it.
 *
 * Keep this an **exact-surface** re-export — add only the symbols consumers
 * actually need; never re-export a package wholesale. Besides the `@cardano-sdk`
 * namespaces below, this seam is also the host's SINGLE admission point for the few
 * **non-SDK** externals it admits — `buffer` (runtime) and type-fest's `Tagged`
 * (type-only) for the first-party libs, plus the Bitcoin signing/derivation libs
 * (`bitcoinjs-lib`, `@bitcoinerlab/secp256k1`, `@scure/bip32`, `bip39`) the host's
 * Bitcoin surfaces need and the Midnight HD derivation leaf
 * (`@midnightntwrk/wallet-sdk-hd`) the host's Midnight sealing surfaces need.
 * Funneling them here keeps every first-party lib admitted into the closure
 * 100% first-party (no direct external import or global),
 * so every external the privileged closure bundles is audited in this one built artifact
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 */
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
// compromise fingerprint (ADR 56). The @cardano-sdk/crypto derivation above
// already inlines THIS libsodium copy, so admitting it by name dedupes into the
// same chunk instead of adding an external tree.
export { default as sodium } from 'libsodium-wrappers-sumo';

// Non-SDK externals, funneled through the same audited seam (see header): `buffer` is
// the runtime polyfill core's byte value-objects use; type-fest's `Tagged` is the
// type-only nominal-typing primitive behind every value object (ADR 13).
export { Buffer } from 'buffer';
export type { Tagged } from 'type-fest';

// noble/scure-grade crypto primitives for the SBV1 SecretBox scheme (Argon2id +
// ChaCha20-Poly1305): the SDK provides only EMIP-003, so these enter here rather
// than being imported directly by core, keeping core first-party (ADR 37).
export { argon2idAsync } from '@noble/hashes/argon2';
export { randomBytes } from '@noble/hashes/utils';
export { chacha20poly1305 } from '@noble/ciphers/chacha.js';

// Bitcoin signing & derivation externals — the host's Bitcoin sealing, data
// plane, and sign surfaces reach these through the same audited seam, mirroring
// the symbols packages/module/blockchain-bitcoin imports. bip39 is pinned to
// 3.0.4 to match the `@cardano-sdk/key-management` transitive already inlined
// above, so esbuild dedupes to a single bip39 copy.
export {
  address,
  crypto,
  initEccLib,
  networks,
  payments,
  Psbt,
  script,
  Transaction,
} from 'bitcoinjs-lib';
export type { Network, Signer } from 'bitcoinjs-lib';
// secp256k1 exposes only named functions (no default), so the namespace form
// matches the `import * as ecc` shape `initEccLib(ecc)` expects (cf. `Crypto`).
export * as secp256k1 from '@bitcoinerlab/secp256k1';
export { HDKey } from '@scure/bip32';
export { mnemonicToSeedSync } from 'bip39';

// Midnight HD derivation — the host's Midnight sealing surfaces derive the
// per-role keys (Zswap / Dust / NightExternal) from a BIP-39 seed through this
// same audited seam, mirroring what
// packages/module/midnight-sync/.../in-memory-wallet-integration-factory
// imports from `@midnightntwrk/wallet-sdk/hd`. That subpath is a bare
// `export * from '@midnightntwrk/wallet-sdk-hd'`, so depending on the leaf
// directly yields BYTE-IDENTICAL derivation. The leaf is PURE JS (deps
// `@scure/bip32@^2.0.1` + `@scure/bip39@^2.0.1`) — it pulls NO
// `@midnight-ntwrk/ledger-v8` or other WASM into the closure (the engine
// runtime stays a direct host dep, ADR 37 / ADR 47). `@scure/bip32` dedupes
// against the 2.0.1 pinned above; `@scure/bip39@2.0.1` arrives transitively and
// dedupes to the workspace's single copy, mirroring the bip39 3.0.4 precedent
// above. Only the seed-based `HDWallet.fromSeed` path is used (no mnemonic
// util), so `@scure/bip39` tree-shakes out of the built bundle.
export { HDWallet, Roles } from '@midnightntwrk/wallet-sdk-hd';

// Air-gapped QR protocol externals — the host's Keystone/SeedSigner ceremony
// surfaces and the shared codecs in @lace-lib/core reach these through the same
// audited seam, mirroring the symbols the monolith's air-gapped protocol libs
// import. All pure JS, zero install scripts.
//
// UR fountain framing (@ngraveio/bc-ur): the animated-QR transport core's
// ur-transport codec builds and reassembles.
export { UR, URDecoder, UREncoder } from '@ngraveio/bc-ur';
// BC-UR registry base classes (@keystonehq/bc-ur-registry): the Keystone
// account-pairing request/response types. Curve/DerivationAlgorithm must be set
// explicitly (registry defaults are secp256k1/slip10).
export {
  CryptoKeypath,
  CryptoMultiAccounts,
  Curve,
  DerivationAlgorithm,
  KeyDerivation,
  KeyDerivationSchema,
  PathComponent,
  QRHardwareCall,
  QRHardwareCallType,
  QRHardwareCallVersion,
} from '@keystonehq/bc-ur-registry';
export type { CryptoHDKey } from '@keystonehq/bc-ur-registry';
// BC-UR Cardano registry (@keystonehq/bc-ur-registry-cardano): the Keystone
// Cardano sign message types. Its CryptoKeypath/PathComponent are a DISTINCT
// bundled copy from the base registry's (not referentially equal); the tx-hash
// flow constructs them for the cardano sign classes, so they are admitted under
// Cardano-prefixed names to keep both families available without collision.
export {
  CardanoSignDataRequest,
  CardanoSignDataSignature,
  CardanoSignRequest,
  CardanoSignTxHashRequest,
  CardanoSignature,
  CryptoKeypath as CardanoCryptoKeypath,
  PathComponent as CardanoPathComponent,
} from '@keystonehq/bc-ur-registry-cardano';
export type {
  CardanoCertKeyData,
  CardanoUtxoData,
} from '@keystonehq/bc-ur-registry-cardano';
