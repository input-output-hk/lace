import type { CurrentPortfolioStakePool } from '../../store/types';
import type { StakingNotificationType } from '../types';
import type { AssetActivityListProps } from '@lace/core';
import { hasPendingDelegationTransaction, isPortfolioDrifted } from '.';

type GetCurrentStakingNotificationParams = {
  walletActivities: AssetActivityListProps[];
  currentPortfolio: CurrentPortfolioStakePool[];
};

export const getCurrentStakingNotification = ({
  walletActivities,
  currentPortfolio,
}: GetCurrentStakingNotificationParams): StakingNotificationType | null => {
  const pendingDelegationTransaction = hasPendingDelegationTransaction(walletActivities);

  if (pendingDelegationTransaction) {
    return currentPortfolio.length === 0 ? 'pendingFirstDelegation' : 'pendingPoolMigration';
  }

  if (isPortfolioDrifted(currentPortfolio)) {
    return 'portfolioDrifted';
  }

  return null;
};
