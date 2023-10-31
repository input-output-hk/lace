import type { CurrentPortfolioStakePool } from '../../store';
import type { StakingNotificationType } from './types';
import type { AssetActivityListProps } from '@lace/core';
import { isPortfolioDrifted } from '../../portfolio-drift';
import { hasPendingDelegationTransaction } from '../helpers';

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
