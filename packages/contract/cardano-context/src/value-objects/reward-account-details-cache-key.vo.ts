import type { CardanoRewardAccount } from '../types';
import type { Tagged } from 'type-fest';

/**
 * Differs from `UtxoCacheKey`: combines two activity anchors plus a single
 * stake key (the side effect fetches only the first). Omits
 * `accountAddressCount` — reward account info depends on the stake key, not on
 * payment addresses.
 *
 * Reward account info changes on two independent events, and the key must
 * advance on either:
 * - `topNonPendingActivityId` — topmost non-Pending activity **including**
 *   Rewards, so an epoch reward arriving on top advances the key (refreshes
 *   `rewardsSum`).
 * - `topOnChainTxActivityId` — topmost non-Pending activity **excluding**
 *   Rewards, so a confirmed tx (delegation / vote / withdrawal) advances the
 *   key even when a future-dated Rewards entry already sits on top. Rewards
 *   are timestamped by their spendable date (epochs ahead — see
 *   `getRewardSpendableDate`), so a freshly-confirmed tx lands *below* such a
 *   reward in the timestamp-sorted activity list and would never move
 *   `topNonPendingActivityId`. Without this second anchor the post-confirm
 *   refetch never fires and `poolId` / `drepId` stay stale until reload.
 */
export type RewardAccountDetailsCacheKey = Tagged<
  string,
  'RewardAccountDetailsCacheKey'
>;

export const RewardAccountDetailsCacheKey = (params: {
  topNonPendingActivityId: string;
  topOnChainTxActivityId: string;
  stakeKey: CardanoRewardAccount;
}): RewardAccountDetailsCacheKey =>
  `${params.topNonPendingActivityId}:${params.topOnChainTxActivityId}:${params.stakeKey}` as RewardAccountDetailsCacheKey;
