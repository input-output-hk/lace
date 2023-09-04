import { AssetActivityListProps, TransactionType } from '@lace/core';
import flatMap from 'lodash/flatMap';

const DelegationTransactionTypes: Set<TransactionType> = new Set([
  'delegation',
  'delegationRegistration',
  'delegationDeregistration',
]);

export const hasPendingDelegationTransaction = (walletActivities: AssetActivityListProps[]) =>
  flatMap(walletActivities, ({ items }) => items).some(
    ({ type, status }) => type && DelegationTransactionTypes.has(type) && status === 'sending'
  );
