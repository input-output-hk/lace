import type { CurrentPortfolioStakePool } from '../../store';
import type { StakingNotificationType } from './types';
import type { AssetActivityListProps } from '@lace/core';
import { hasPendingDelegationTransaction, hasSaturatedOrRetiredPools, isPortfolioDrifted } from '../helpers';

type GetCurrentStakingNotificationParams = {
  walletActivities: AssetActivityListProps[];
  currentPortfolio: CurrentPortfolioStakePool[];
};

export const getCurrentStakingNotifications = ({
  walletActivities,
  currentPortfolio,
}: GetCurrentStakingNotificationParams): StakingNotificationType[] => {
  const pendingDelegationTransaction = hasPendingDelegationTransaction(walletActivities);
  const notifications: StakingNotificationType[] = [];

  if (pendingDelegationTransaction) {
    currentPortfolio.length === 0
      ? notifications.push('pendingFirstDelegation')
      : notifications.push('pendingPoolMigration');
  }

  if (isPortfolioDrifted(currentPortfolio)) {
    notifications.push('portfolioDrifted');
  }

  if (hasSaturatedOrRetiredPools(currentPortfolio)) {
    notifications.push('poolRetiredOrSaturated');
  }

  return notifications;
};
