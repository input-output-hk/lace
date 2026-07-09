import type { Tagged } from 'type-fest';

/**
 * Stable, key-derived identity for a wallet account. Two wallet entities that
 * share an AccountIdentityKey represent the same underlying keys, e.g. the same
 * hardware device, the same seed loaded on two devices, or a v1-migrated wallet
 * being re-added in v2. Derived from public-key material by the blockchain that
 * owns the account's `blockchainSpecific` shape, via the wallet-identity addon.
 */
export type AccountIdentityKey = Tagged<string, 'AccountIdentityKey'>;
export const AccountIdentityKey = (value: string): AccountIdentityKey =>
  value as AccountIdentityKey;
