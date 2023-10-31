import type { CurrentPortfolioStakePool } from '../../store';
import type { StakingNotificationType } from './types';
import type { AssetActivityListProps } from '@lace/core';
import { isPortfolioDrifted } from '../../portfolio-drift';
import { hasPendingDelegationTransaction, hasSaturatedOrRetiredPools } from '../helpers';

type GetCurrentStakingNotificationsParams = {
  walletActivities: AssetActivityListProps[];
  currentPortfolio: CurrentPortfolioStakePool[];
};

export const getCurrentStakingNotifications = ({
  walletActivities,
  currentPortfolio,
}: GetCurrentStakingNotificationsParams): StakingNotificationType[] => {
  const pendingDelegationTransaction = hasPendingDelegationTransaction(walletActivities);

  if (pendingDelegationTransaction) {
    return currentPortfolio.length === 0 ? ['pendingFirstDelegation'] : ['pendingPoolMigration'];
  }

  return [
    isPortfolioDrifted(currentPortfolio) ? 'portfolioDrifted' : undefined,
    hasSaturatedOrRetiredPools(currentPortfolio) ? 'poolRetiredOrSaturated' : undefined,
  ].filter(Boolean) as StakingNotificationType[];
};
