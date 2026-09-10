import { BigNumber } from '@lace-lib/util';

import type { RewardAccountInfo } from '@lace-contract/cardano-context';

/**
 * Total withdrawable rewards (lovelace) the sweep cannot move: those on a
 * rewards-bearing account whose voting power was never delegated. Returns 0n when
 * the sweep can proceed. A positive value is both the refuse signal and the amount
 * to disclose on the refusal screen.
 *
 * Conway permits a withdrawal from any vote-delegated stake key, whatever the
 * target — so a specific DRep qualifies, not only the abstain / no-confidence
 * placeholders.
 *
 * This deliberately matches `getDelegationHealth`'s `not-delegated` case rather
 * than defining a second classification: Lace already treats a retired or expired
 * DRep as `drep-problem`, a loss of representation ("no longer active — update
 * your delegation") and NOT a rewards problem, while reserving the locked-rewards
 * warning for a key with no DRep at all. A guard that refused retired DReps here
 * would contradict what the staking and governance centers tell the same user.
 */
export const blockedWithdrawableRewards = (
  rewardInfos: readonly Pick<
    RewardAccountInfo,
    'drepId' | 'withdrawableAmount'
  >[],
): bigint =>
  rewardInfos.reduce((total, info) => {
    const withdrawable = BigNumber.valueOf(info.withdrawableAmount);
    return withdrawable > 0n && info.drepId === undefined
      ? total + withdrawable
      : total;
  }, 0n);
