/**
 * Blockfrost surfaces the two special vote-delegation targets as these sentinel
 * `drep_id` strings on a reward account, instead of as a real bech32 DRep id.
 * They must NOT be resolved as real DReps (there is no such DRep). If the
 * upstream value ever differs, callers that classify by these constants fall
 * through to their "specific DRep" branch, a safe (if less specific) fallback.
 */
export const DREP_ALWAYS_ABSTAIN = 'drep_always_abstain';
export const DREP_ALWAYS_NO_CONFIDENCE = 'drep_always_no_confidence';

/** True when `drepId` is one of Blockfrost's abstain / no-confidence sentinels. */
export const isSentinelDrepId = (drepId: string): boolean =>
  drepId === DREP_ALWAYS_ABSTAIN || drepId === DREP_ALWAYS_NO_CONFIDENCE;
