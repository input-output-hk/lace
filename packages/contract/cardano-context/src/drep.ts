import { Cardano } from '@cardano-sdk/core';

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

/**
 * `value` as a lower-case CIP-129 DRep id, or `undefined` when it is not a
 * DRep id — including the sentinels, a pool id, and any non-string.
 *
 * Takes `unknown` and never raises, because it sits between a
 * runtime-editable config payload and code that compares DRep ids: one DRep
 * may be written in either encoding and either case, so reducing it here is
 * what lets those comparisons be plain equality. Callers past this point need
 * no type or shape guard.
 */
export const toCanonicalDrepId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try {
    return Cardano.DRepID.toCip129DRepID(Cardano.DRepID(value.toLowerCase()));
  } catch {
    return undefined;
  }
};

/**
 * True when `drepId` parses as a real DRep id — bech32 under hrp `drep` or
 * `drep_script`, in either the CIP-129 or the legacy CIP-105 encoding.
 *
 * Shape only: it says nothing about whether such a DRep is registered. Its
 * job is to catch a value that can never match ANY DRep — a hand-typed
 * config id with a transposed character, say — which would otherwise fail
 * silently, matching nothing and raising nothing. The sentinels are NOT
 * DRep ids by this test; classify those with `isSentinelDrepId`.
 *
 * Defined as "reducible to a canonical id" so that whatever reports an
 * unusable config id and whatever drops it cannot disagree. Testing the
 * bech32 parse alone was not the same question: it accepted a CIP-129 id
 * whose header names a committee credential rather than a DRep, and rejected
 * a mixed-case id that bech32 permits and the reducer handles.
 */
export const isDrepId = (drepId: string): boolean =>
  toCanonicalDrepId(drepId) !== undefined;
