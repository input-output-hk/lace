import { Cardano } from '@cardano-sdk/core';

import type { EraSummary } from '@cardano-sdk/core';

/**
 * First absolute slot of the given epoch, derived from the era summaries.
 *
 * Deliberately reimplements the SDK's epoch->slot walk WITHOUT its module-level
 * `memoize` (`epochSlotsCalc`): that cache keys on the epoch number alone and
 * ignores the era-summaries argument, so a slot computed for one network leaks
 * to another with the same epoch number. Keeping this pure makes epoch->date a
 * pure function of (epoch, eraSummaries) — do not swap back to `epochSlotsCalc`.
 */
export const getEpochFirstSlot = (
  epoch: Cardano.EpochNo,
  eraSummaries: readonly EraSummary[],
): Cardano.Slot => {
  let atEpoch = 0;
  let atSlot: number = eraSummaries[0].start.slot;
  let index = 0;
  const lastIndex = eraSummaries.length - 1;
  const shouldAdvanceEra = () =>
    index < lastIndex && atSlot >= eraSummaries[index + 1].start.slot;
  while (shouldAdvanceEra()) index++;
  while (atEpoch !== epoch) {
    atSlot += eraSummaries[index].parameters.epochLength;
    atEpoch++;
    while (shouldAdvanceEra()) index++;
  }
  return Cardano.Slot(atSlot);
};
