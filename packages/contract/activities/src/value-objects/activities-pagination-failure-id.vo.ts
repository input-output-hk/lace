import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * The failure ID recorded when loading an account's older activities fails.
 * While that failure is present, the account stops loading further pages.
 * Create one per account with `ActivitiesPaginationFailureId(accountId)`.
 */
export type ActivitiesPaginationFailureId = Tagged<
  FailureId,
  'ActivitiesPaginationFailureId'
>;

const PREFIX = 'activities-pagination-';

/** The pagination failure ID of an account. */
export const ActivitiesPaginationFailureId = (
  accountId: AccountId,
): ActivitiesPaginationFailureId =>
  `${PREFIX}${accountId}` as ActivitiesPaginationFailureId;
