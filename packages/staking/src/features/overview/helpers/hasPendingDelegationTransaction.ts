import { ActivityStatus, AssetActivityListProps, DelegationTransactionType } from '@lace/core';
import flatMap from 'lodash/flatMap';

export const hasPendingDelegationTransaction = (walletActivities: AssetActivityListProps[]) =>
  flatMap(walletActivities, ({ items }) => items).some(
    ({ type, status }) => type && type in DelegationTransactionType && status === ActivityStatus.PENDING
  );
