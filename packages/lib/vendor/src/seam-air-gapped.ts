// The air-gapped QR protocol libraries this seam admits (index.ts).

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
