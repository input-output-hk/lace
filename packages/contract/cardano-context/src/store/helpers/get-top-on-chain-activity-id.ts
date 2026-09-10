import { ActivityType } from '@lace-contract/activities';

import type { CardanoActivityUtxoMetadata } from '../../augmentations';
import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';

export type TopOnChainActivity = {
  activityId: string;
  /**
   * Anchoring slot of the top on-chain tx. Absent on activities persisted
   * before this field was introduced, or on Rewards activities (which carry
   * an epoch, not a slot).
   */
  slot?: Cardano.Slot;
  /**
   * Every outpoint this transaction spent, unresolved — see
   * `CardanoActivityUtxoMetadata.consumedInputs`. Empty means UNKNOWN
   * (an activity persisted before confirmed transactions carried this), never
   * "spent nothing".
   */
  consumedInputs: readonly Cardano.TxIn[];
  /**
   * Outpoints of this transaction's outputs paying addresses the account
   * owned at map time — see `CardanoActivityUtxoMetadata.producedOwnOutpoints`.
   * Empty carries no evidence (legacy activity, or nothing paid to us).
   */
  producedOwnOutpoints: readonly Cardano.TxIn[];
};

/**
 * Returns the most-recent non-Pending activity for an account — the top
 * on-chain transaction that affected the account.
 *
 * Activities are sorted newest-first by the activities slice, so `find`
 * returns the top match. Activity ids equal the underlying tx id, and the
 * activities slice dedupes by activityId, so one transaction yields one
 * entry even if it has multiple effects (e.g. Send + Withdrawal).
 *
 * Slot is sourced from `blockchainSpecific.Cardano.slot` set by the tx
 * mapper.
 *
 * Pending entries are always excluded so that submission of a tx (before
 * confirmation) does not advance the result. The activities slice dedupes
 * by activityId, so when a Pending entry is replaced by its on-chain
 * counterpart, the topmost non-Pending id changes once at confirmation.
 *
 * `includeRewardActivities` toggles whether Rewards entries are considered.
 * Reward activity ids are deterministic per `(reward, rewardAccount)`, so
 * each new epoch's reward bumps the topmost id cleanly — set this to `true`
 * for consumers that need to refresh on reward arrival (e.g. `rewardsSum`).
 */
export const getTopOnChainActivity = (
  activitiesByAccount: Record<AccountId, Activity[]>,
  accountId: AccountId,
  includeRewardActivities = false,
): TopOnChainActivity | undefined => {
  const top = activitiesByAccount[accountId]?.find(
    activity =>
      activity.type !== ActivityType.Pending &&
      (includeRewardActivities || activity.type !== ActivityType.Rewards),
  );
  if (!top) return undefined;
  const cardano = (
    top.blockchainSpecific as
      | { Cardano?: CardanoActivityUtxoMetadata }
      | undefined
  )?.Cardano;
  return {
    activityId: top.activityId,
    slot: cardano?.slot,
    consumedInputs: cardano?.consumedInputs ?? [],
    producedOwnOutpoints: cardano?.producedOwnOutpoints ?? [],
  };
};
