import type {
  BlockfrostPartialStakePool,
  BlockfrostStakePool,
  BlockfrostStakePoolMetadata,
  LacePartialStakePool,
  LaceStakePool,
} from '../types';
import type { Cardano } from '@cardano-sdk/core';

/** Converts a Blockfrost fraction (e.g. 0–1) to a percentage with 2 decimal places (0–100 scale). */
export const toPercentage = (value: number) =>
  Math.round(value * 100 * 100) / 100;

export const toLacePartialStakePool = (
  pool: BlockfrostPartialStakePool,
): LacePartialStakePool => {
  const {
    active_stake,
    blocks_minted,
    declared_pledge,
    fixed_cost,
    live_saturation,
    live_stake,
    margin_cost,
    metadata,
    pool_id,
  } = pool;

  return {
    activeStake: Number(active_stake),
    blocks: blocks_minted,
    cost: Number(fixed_cost),
    declaredPledge: Number(declared_pledge),
    description: metadata?.description ?? null,
    liveSaturation: toPercentage(live_saturation),
    liveStake: Number(live_stake),
    margin: margin_cost,
    poolId: pool_id as Cardano.PoolId,
    poolName: metadata?.name ?? null,
    ticker: metadata?.ticker ?? null,
  };
};

export interface ToLaceStakePoolInput {
  poolId: Cardano.PoolId;
  pool: BlockfrostStakePool | null;
  metadata: BlockfrostStakePoolMetadata | null;
  retiringPools: Cardano.PoolId[];
  now: () => number;
}

export const toLaceStakePool = ({
  poolId,
  pool,
  metadata,
  retiringPools,
  now,
}: ToLaceStakePoolInput): LaceStakePool => {
  if (!pool) {
    return {
      activeStake: 0,
      blocks: 0,
      cost: 0,
      declaredPledge: 0,
      description: null,
      hexId: '',
      liveDelegators: 0,
      livePledge: 0,
      liveSaturation: 0,
      liveStake: 0,
      margin: 0,
      owners: [],
      poolId,
      poolName: null,
      status: 'retired',
      ticker: null,
      timestamp: now(),
    };
  }

  return {
    activeStake: Number(pool.active_stake),
    blocks: pool.blocks_minted,
    cost: Number(pool.fixed_cost),
    declaredPledge: Number(pool.declared_pledge),
    description: metadata?.description ?? null,
    hexId: pool.hex,
    liveDelegators: pool.live_delegators,
    livePledge: Number(pool.live_pledge),
    liveSaturation: toPercentage(pool.live_saturation),
    liveStake: Number(pool.live_stake),
    margin: pool.margin_cost,
    owners: pool.owners ?? [],
    poolId,
    poolName: metadata?.name ?? null,
    status: retiringPools.includes(poolId) ? 'retiring' : 'active',
    ticker: metadata?.ticker ?? null,
    timestamp: now(),
  };
};
