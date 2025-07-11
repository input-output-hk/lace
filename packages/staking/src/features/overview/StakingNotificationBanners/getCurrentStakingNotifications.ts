import type { StakingNotificationType } from './types';
import type { AssetActivityListProps } from '@lace/core';
import { CurrentPortfolioStakePool, isPortfolioDrifted } from '../../store';
import { hasPendingDelegationTransaction, hasPledgeNotMetPools, hasSaturatedOrRetiredPools } from '../helpers';

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
    return currentPortfolio.length === 0 ? ['pendingFirstDelegation'] : ['pendingPortfolioModification'];
  }

  return [
    isPortfolioDrifted(currentPortfolio) ? 'portfolioDrifted' : undefined,
    hasSaturatedOrRetiredPools(currentPortfolio) ? 'poolRetiredOrSaturated' : undefined,
    hasPledgeNotMetPools(currentPortfolio) ? 'pledgeNotMet' : undefined,
  ].filter(Boolean) as StakingNotificationType[];
};
