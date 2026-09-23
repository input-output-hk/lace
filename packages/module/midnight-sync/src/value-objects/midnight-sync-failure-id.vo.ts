import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for a Midnight account's wallet-sync failure.
 *
 * Keyed by accountId (ADR 13 hierarchical pattern), NOT walletId: each account
 * is watched independently, so a sibling account's successful sync must not
 * dismiss a still-broken account's failure. Stable across retry attempts —
 * account context only, no instance or timestamp.
 */
export type MidnightSyncFailureId = FailureId &
  Tagged<string, 'MidnightSyncFailureId'>;

export const MidnightSyncFailureId = (
  accountId: AccountId,
): MidnightSyncFailureId =>
  `midnight-sync-${accountId}` as MidnightSyncFailureId;
