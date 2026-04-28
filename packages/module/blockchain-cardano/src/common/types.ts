/**
 * Configuration for slot calculations in the Cardano blockchain.
 */
export type SlotConfig = {
  zeroTime: number;
  zeroSlot: number;
  slotLength: number;
  startEpoch: number;
  epochLength: number;
};
