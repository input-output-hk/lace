import type { ByteArray } from '@lace-sdk/util';
import type { Tagged } from 'type-fest';

/**
 * Base type for Midnight secret keys.
 *
 * Extends ByteArray using hierarchical pattern (ADR 13).
 * Specialized key types extend this base type.
 *
 * @example
 * const key: MidnightSecretKey = MidnightSecretKey(keyBytes);
 */
export type MidnightSecretKey = Tagged<ByteArray, 'MidnightSecretKey'>;
export const MidnightSecretKey = (value: Uint8Array): MidnightSecretKey =>
  value as MidnightSecretKey;

/**
 * Zswap secret key for shielded transactions.
 *
 * Used to derive ZswapSecretKeys from the Midnight SDK.
 */
export type ZswapMidnightSecretKey = Tagged<
  MidnightSecretKey,
  'ZswapMidnightSecretKey'
>;
export const ZswapMidnightSecretKey = (
  value: ByteArray,
): ZswapMidnightSecretKey => value as ZswapMidnightSecretKey;

/**
 * Dust secret key for fee management.
 *
 * Used to derive DustSecretKey from the Midnight SDK.
 */
export type DustMidnightSecretKey = Tagged<
  MidnightSecretKey,
  'DustMidnightSecretKey'
>;
export const DustMidnightSecretKey = (
  value: ByteArray,
): DustMidnightSecretKey => value as DustMidnightSecretKey;

/**
 * Night external secret key for unshielded transactions.
 *
 * Used for deriving the unshielded wallet keystore.
 */
export type NightExternalMidnightSecretKey = Tagged<
  MidnightSecretKey,
  'NightExternalMidnightSecretKey'
>;
export const NightExternalMidnightSecretKey = (
  value: ByteArray,
): NightExternalMidnightSecretKey => value as NightExternalMidnightSecretKey;
