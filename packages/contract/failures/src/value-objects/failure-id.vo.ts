import type { Tagged } from 'type-fest';

/**
 * Base type for failure identifiers using Tagged type pattern (ADR 13).
 * Domain-specific failure IDs should extend this type using hierarchical pattern.
 *
 * **Naming convention:** `{blockchain}-{category}-{dynamic-id}`. The
 * failures-store side effect that forwards failures to analytics parses
 * the first two segments to populate `blockchain` and `category` on
 * `failure | tracked` events; new failure-id value objects should follow
 * this shape so analytics segmentation works without per-caller wiring.
 *
 * @example
 * // In domain package:
 * export type CardanoSyncFailureId = FailureId & Tagged<string, 'CardanoSyncFailureId'>;
 * export const CardanoSyncFailureId = (accountId: AccountId): CardanoSyncFailureId =>
 *   `cardano-sync-${accountId}` as CardanoSyncFailureId;
 */
export type FailureId = Tagged<string, 'FailureId'>;
export const FailureId = (value: string): FailureId => value as FailureId;
