import { ActivityStatus, AssetActivityListProps, ConwayEraCertificatesTypes, DelegationActivityType } from '@lace/core';
import flatMap from 'lodash/flatMap';

export const hasPendingDelegationTransaction = (walletActivities: AssetActivityListProps[]) =>
  flatMap(walletActivities, ({ items }) => items).some(
    ({ type, status }) =>
      type &&
      (type in DelegationActivityType ||
        type === ConwayEraCertificatesTypes.Registration ||
        type === ConwayEraCertificatesTypes.Unregistration) &&
      status === ActivityStatus.PENDING
  );
