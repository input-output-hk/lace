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

  if (pendingDelegationTransaction) {
    return currentPortfolio.length === 0 ? ['pendingFirstDelegation'] : ['pendingPoolMigration'];
  }

  return [
    isPortfolioDrifted(currentPortfolio) ? 'portfolioDrifted' : undefined,
    hasSaturatedOrRetiredPools(currentPortfolio) ? 'poolRetiredOrSaturated' : undefined,
  ].filter(Boolean) as StakingNotificationType[];
};
