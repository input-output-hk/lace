import { createSlotTimeCalc, epochSlotsCalc, Cardano } from '@cardano-sdk/core';

import type { EraSummary } from '@cardano-sdk/core';

export const calculateEpochFromSlot = (
  slot: Cardano.Slot,
  eraSummaries: readonly EraSummary[],
): Cardano.EpochNo => {
  const mutableEraSummaries = eraSummaries as EraSummary[];
  for (let index = mutableEraSummaries.length - 1; index >= 0; index--) {
    const era = mutableEraSummaries[index];
    if (slot >= era.start.slot) {
      const slotsSinceEraStart = slot - era.start.slot;
      const epochLength = era.parameters.epochLength;
      const epoch = Math.floor(slotsSinceEraStart / epochLength);
      let startingEpoch = 0;
      for (let index_ = 0; index_ < index; index_++) {
        const previousEra = mutableEraSummaries[index_];
        const previousEpochLength = previousEra.parameters.epochLength;
        const previousEraSlots =
          (mutableEraSummaries[index_ + 1]?.start.slot ?? Infinity) -
          previousEra.start.slot;
        startingEpoch += Math.floor(previousEraSlots / previousEpochLength);
      }
      return Cardano.EpochNo(startingEpoch + epoch);
    }
  }
  return Cardano.EpochNo(0);
};

export const calculateEpochEnd = (
  currentEpoch: Cardano.EpochNo,
  eraSummaries: readonly EraSummary[],
): Date => {
  const nextEpoch = (currentEpoch + 1) as Cardano.EpochNo;
  const mutableEraSummaries = eraSummaries as EraSummary[];
  const slotTimeCalc = createSlotTimeCalc(mutableEraSummaries);
  return slotTimeCalc(epochSlotsCalc(nextEpoch, mutableEraSummaries).firstSlot);
};
