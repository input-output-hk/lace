import { hasCorrectVoteDelegation } from './hasCorrectVoteDelegation';
import { DeRegistrationsWithRewardsLocked } from './types';

import type { RewardAccountWithPoolId } from '../types';

export const ensureNoDeRegistrationsWithRewardsLocked = (
  rewardAccountsToBeDeRegistered: RewardAccountWithPoolId[],
) => {
  const rewardAccountsWithLockedRewards = rewardAccountsToBeDeRegistered.filter(
    rewardAccountWithPoolId =>
      rewardAccountWithPoolId.rewardBalance > 0n &&
      !hasCorrectVoteDelegation(rewardAccountWithPoolId),
  );

  if (rewardAccountsWithLockedRewards.length > 0) {
    throw new DeRegistrationsWithRewardsLocked(rewardAccountsWithLockedRewards);
  }
};
