import type { Tagged } from 'type-fest';

/**
 * Base type for failure identifiers using Tagged type pattern (ADR 13).
 * Domain-specific failure IDs should extend this type using hierarchical pattern.
 *
 * @example
 * // In domain package:
 * export type SyncFailureId = FailureId & Tagged<string, 'SyncFailureId'>;
 * export const SyncFailureId = (accountId: AccountId, operationType: string): SyncFailureId =>
 *   `sync-${accountId}-${operationType}` as SyncFailureId;
 */
export type FailureId = Tagged<string, 'FailureId'>;
export const FailureId = (value: string): FailureId => value as FailureId;
