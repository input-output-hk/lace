import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

export type ActivitiesPaginationFailureId = Tagged<
  FailureId,
  'ActivitiesPaginationFailureId'
>;

const PREFIX = 'activities-pagination-';

export const ActivitiesPaginationFailureId = (
  accountId: AccountId,
): ActivitiesPaginationFailureId =>
  `${PREFIX}${accountId}` as ActivitiesPaginationFailureId;
