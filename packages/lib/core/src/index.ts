export * from './address';
export * from './emip3';
export * from './encrypt-recovery-phrase';
export * from './secret-box';
export * from './key-hash';
export * from './key-path';
export type * from './value-objects/address.vo';
export * from './value-objects/bytes.vo';
export * from './value-objects/wallet-id.vo';

// Full account-xpub → GroupedAddress derivation: re-exported from the SDK through
// the vendor seam rather than re-composed here, so consumers get the SDK's own
// derivation byte-identically.
export { Bip32Account } from '@lace-lib/vendor';
