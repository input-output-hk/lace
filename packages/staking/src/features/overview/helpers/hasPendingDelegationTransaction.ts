import { ActivityStatus, AssetActivityListProps, DelegationActivityType } from '@lace/core';
import flatMap from 'lodash/flatMap';

export const hasPendingDelegationTransaction = (walletActivities: AssetActivityListProps[]) =>
  flatMap(walletActivities, ({ items }) => items).some(
    ({ type, status }) => type && type in DelegationActivityType && status === ActivityStatus.PENDING
  );
