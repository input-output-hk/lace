import { Cardano } from '@cardano-sdk/core';

import type { SlotConfig } from './types';

/**
 * Predefined slot configurations for different Cardano networks.
 */
export const SLOT_CONFIG_NETWORK: Partial<
  Record<Cardano.NetworkMagics, SlotConfig>
> = {
  [Cardano.NetworkMagics.Mainnet]: {
    zeroTime: 1596059091000,
    zeroSlot: 4492800,
    slotLength: 1000,
    startEpoch: 208,
    epochLength: 432000,
  },
  [Cardano.NetworkMagics.Preview]: {
    zeroTime: 1666656000000,
    zeroSlot: 0,
    slotLength: 1000,
    startEpoch: 0,
    epochLength: 86400,
  },
  [Cardano.NetworkMagics.Preprod]: {
    zeroTime: 1654041600000 + 1728000000,
    zeroSlot: 86400,
    slotLength: 1000,
    startEpoch: 4,
    epochLength: 432000,
  },
};

/**
 * Converts a given UNIX timestamp (in milliseconds) into its corresponding slot number
 * according to a specific network’s slot configuration.
 *
 * Each Cardano network (mainnet, preprod, preview, etc.) has its own slot parameters:
 * - `zeroTime`: the UNIX timestamp when the slot counting started
 * - `zeroSlot`: the slot number at that zero time
 * - `slotLength`: the duration of each slot in milliseconds
 *
 * The calculation determines how many slots have elapsed since `zeroTime`
 * and adds them to `zeroSlot` to produce the enclosing slot number.
 *
 * @param unixTime - UNIX timestamp in milliseconds to convert to a slot number.
 * @param slotConfig - The {@link SlotConfig} object containing the network’s slot parameters.
 * @returns The slot number corresponding to the given UNIX time.
 */
export const unixTimeToEnclosingSlot = (
  unixTime: number,
  slotConfig: SlotConfig,
): number => {
  const timePassed = unixTime - slotConfig.zeroTime;
  const slotsPassed = Math.floor(timePassed / slotConfig.slotLength);
  return slotsPassed + slotConfig.zeroSlot;
};

/**
 * Resolves the current or given timestamp (in milliseconds) to a Cardano slot number
 * for the specified network.
 *
 * This is a convenience wrapper around {@link unixTimeToEnclosingSlot} that automatically
 * selects the appropriate network’s slot configuration from {@link SLOT_CONFIG_NETWORK}.
 *
 * @param network - The network magic identifier (e.g., `Cardano.NetworkMagics.Mainnet`, `Preprod`, or `Preview`).
 * @param milliseconds - Optional UNIX timestamp in milliseconds. Defaults to the current time (`Date.now()`).
 * @returns The slot corresponding to the provided timestamp and network.
 */
export const resolveSlotNo = (
  network: Cardano.NetworkMagics,
  milliseconds = Date.now(),
): Cardano.Slot => {
  const slotConfig = SLOT_CONFIG_NETWORK[network];
  if (!slotConfig) {
    throw new Error(
      'Slot config of network magic is not supported: ' + network,
    );
  }
  return Cardano.Slot(unixTimeToEnclosingSlot(milliseconds, slotConfig));
};
