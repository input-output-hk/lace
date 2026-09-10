import { SLOT_CONFIG_NETWORK } from './common/time';

import type { Cardano } from '@cardano-sdk/core';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Epochs between delegating and the first rewards landing in the account.
 * A stake snapshot taken in epoch N becomes active in N+2, and the rewards
 * earned then are calculated and paid out at the start of N+4 — a fixed
 * property of the ledger's reward cycle, not a tunable protocol parameter.
 * Kept at the payout boundary (N+4) so the estimate never over-promises.
 */
const EPOCHS_UNTIL_FIRST_REWARD = 4;

/**
 * Estimated whole days from delegating until the first staking rewards arrive,
 * for the given network. Derived from the network's slot parameters (slot
 * length × epoch length gives one epoch in days), so testnets with shorter
 * epochs (e.g. Preview's 1-day epochs) yield a correspondingly shorter estimate
 * than mainnet/preprod's 5-day epochs. `undefined` when the network has no known
 * slot configuration — callers should fall back to network-agnostic copy.
 */
export const estimateDaysUntilFirstReward = (
  chainId: Cardano.ChainId,
): number | undefined => {
  const slotConfig =
    SLOT_CONFIG_NETWORK[chainId.networkMagic as Cardano.NetworkMagics];
  if (!slotConfig) return undefined;

  const epochLengthDays =
    (slotConfig.epochLength * slotConfig.slotLength) / MS_PER_DAY;
  return Math.round(EPOCHS_UNTIL_FIRST_REWARD * epochLengthDays);
};
