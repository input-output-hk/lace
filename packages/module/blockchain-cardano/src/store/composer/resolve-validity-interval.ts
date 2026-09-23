import { Cardano } from '@cardano-sdk/core';

import type { EraSummary } from '@cardano-sdk/core';

// =====================================================================
// Duration (seconds) → absolute validity-interval slots.
// =====================================================================
// A validity interval is measured in SLOTS, counted from the chain tip.
// Two mistakes are easy here and both produce a transaction the node
// rejects (or one that never expires):
//
//   1. using a unix timestamp as a slot number, and
//   2. assuming one slot lasts one second.
//
// Neither holds in general: slot numbers are an independent counter, and
// the slot length is an era parameter. So the conversion anchors on the
// tip SLOT reported by the provider and scales the requested duration by
// the slot length of the era in force at that tip.
// =====================================================================

/** Two hours, matching the send flow's window (`build-tx.ts`). */
export const DEFAULT_VALIDITY_SECONDS = 7200;

/**
 * The era covering `slot`: the last summary that has already started.
 * Summaries arrive oldest-first, so this walks forward while the next
 * era's start is still at or below the slot.
 */
const eraSummaryAtSlot = (
  eraSummaries: readonly EraSummary[],
  slot: number,
): EraSummary => {
  let index = 0;
  while (
    index + 1 < eraSummaries.length &&
    eraSummaries[index + 1].start.slot <= slot
  ) {
    index++;
  }
  return eraSummaries[index];
};

const secondsToSlots = (seconds: number, slotLengthMs: number): number =>
  Math.ceil((seconds * 1000) / slotLengthMs);

export type ResolveValidityIntervalParams = {
  /** Absolute slot of the current chain tip, from the provider. */
  tipSlot: number;
  eraSummaries: readonly EraSummary[];
  /** Window length in seconds; defaults to {@link DEFAULT_VALIDITY_SECONDS}. */
  validitySeconds?: number;
  /** Lower bound in seconds from the tip; omitted → no lower bound. */
  validityStartSeconds?: number;
};

/**
 * Convert a tip-relative duration into the absolute slots a Cardano
 * validity interval needs.
 *
 * @throws If the era summaries are missing/unusable, or the requested
 *   window is not a positive, coherent interval.
 */
export const resolveValidityInterval = ({
  tipSlot,
  eraSummaries,
  validitySeconds = DEFAULT_VALIDITY_SECONDS,
  validityStartSeconds,
}: ResolveValidityIntervalParams): Cardano.ValidityInterval => {
  if (eraSummaries.length === 0) {
    throw new Error(
      'Cannot resolve a validity interval: no Cardano era summaries available',
    );
  }
  if (!Number.isFinite(validitySeconds) || validitySeconds <= 0) {
    throw new Error(
      `Validity window must be a positive number of seconds, got ${validitySeconds}`,
    );
  }

  const { slotLength } = eraSummaryAtSlot(eraSummaries, tipSlot).parameters;
  if (!Number.isFinite(slotLength) || slotLength <= 0) {
    throw new Error(
      `Era summary reports an unusable slot length: ${slotLength}`,
    );
  }

  const invalidHereafter = Cardano.Slot(
    tipSlot + secondsToSlots(validitySeconds, slotLength),
  );

  if (validityStartSeconds === undefined) {
    return { invalidHereafter };
  }
  if (!Number.isFinite(validityStartSeconds) || validityStartSeconds < 0) {
    throw new Error(
      `Validity start must be a non-negative number of seconds, got ${validityStartSeconds}`,
    );
  }
  const invalidBefore = Cardano.Slot(
    tipSlot + secondsToSlots(validityStartSeconds, slotLength),
  );
  if (invalidBefore >= invalidHereafter) {
    throw new Error(
      `Validity window is empty: start slot ${invalidBefore} is not before end slot ${invalidHereafter}`,
    );
  }
  return { invalidBefore, invalidHereafter };
};
