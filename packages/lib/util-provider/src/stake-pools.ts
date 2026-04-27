import { Cardano } from '@cardano-sdk/core';
import { Percent } from '@cardano-sdk/util';

import type { Responses } from '@blockfrost/blockfrost-js';

type WithoutNulls<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

export type BlockFrostPool = Responses['pool'] & {
  metadata: Responses['pool_metadata'];
};

export const toCorePool = (pool: BlockFrostPool): Cardano.StakePool => ({
  cost: BigInt(pool.fixed_cost),
  hexId: pool.hex as Cardano.PoolIdHex,
  id: pool.pool_id as Cardano.PoolId,
  margin: Cardano.FractionUtils.toFraction(pool.margin_cost),
  metadata: pool.metadata as WithoutNulls<Responses['pool_metadata']>,
  metrics: {
    blocksCreated: pool.blocks_minted,
    delegators:
      typeof pool.live_delegators === 'number' ? pool.live_delegators : 0,
    livePledge:
      typeof pool.live_pledge === 'string' ? BigInt(pool.live_pledge) : 0n,
    saturation: Percent(pool.live_saturation),
    size: { active: Percent(0), live: Percent(0) },
    stake: { active: BigInt(pool.active_stake), live: BigInt(pool.live_stake) },
    lastRos: Percent(0),
    ros: Percent(0),
  },
  owners: pool.owners?.map(owner => Cardano.RewardAccount(owner)) || [],
  pledge: BigInt(pool.declared_pledge),
  relays: [],
  rewardAccount: '' as Cardano.RewardAccount,
  status: Cardano.StakePoolStatus.Active,
  vrf: '' as Cardano.VrfVkHex,
});
