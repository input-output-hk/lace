import { estimateStakePoolROS } from '@lace-contract/cardano-stake-pools';

import type {
  LaceStakePool,
  StakePoolsNetworkData,
} from '@lace-contract/cardano-stake-pools';

/**
 * Details-screen shape: the full pool annotated with its estimated annual
 * return. The math lives in the contract (`estimateStakePoolROS`) so the
 * browse list — and any other module — can estimate from the same formula
 * without importing this module (ADR 14); this wrapper only preserves the
 * annotated-pool shape the details pages consume.
 */
export const estimateROS = (
  stakePool: LaceStakePool | undefined,
  stakePoolsNetworkData: StakePoolsNetworkData,
) => {
  if (!stakePool) return undefined;
  return {
    ...stakePool,
    ros: estimateStakePoolROS(stakePool, stakePoolsNetworkData),
  };
};
