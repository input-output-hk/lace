import type { Responses } from '@blockfrost/blockfrost-js';
import type { Cardano, ProviderError } from '@cardano-sdk/core';
import type { CardanoProviderContext } from '@lace-contract/cardano-context';
import type { LaceBrowsePool } from '@lace-lib/ui-toolkit';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

/**
 * Pick only relevant Responses['pool_metadata'] fields to simplify mocking
 */
export type BlockfrostStakePoolMetadata = Pick<
  Responses['pool_metadata'],
  'description' | 'name' | 'ticker'
> | null;

/**
 * Pick only relevant Responses['pool'] fields to simplify mocking
 */
export type BlockfrostStakePool = Pick<
  Responses['pool'],
  | 'active_stake'
  | 'blocks_minted'
  | 'declared_pledge'
  | 'fixed_cost'
  | 'hex'
  | 'live_delegators'
  | 'live_pledge'
  | 'live_saturation'
  | 'live_stake'
  | 'margin_cost'
  | 'owners'
  | 'pool_id'
> | null;

/**
 * Blockfrost does not exports the interface for pools/extended endpoint: we need to build it manually.
 */
export type BlockfrostPartialStakePool = Pick<
  Responses['pool'],
  | 'active_stake'
  | 'blocks_minted'
  | 'declared_pledge'
  | 'fixed_cost'
  | 'live_saturation'
  | 'live_stake'
  | 'margin_cost'
  | 'pool_id'
> & { metadata: BlockfrostStakePoolMetadata };

export interface LacePartialStakePool {
  activeStake: number;
  blocks: number;
  cost: number;
  description: string | null;
  declaredPledge: number;
  poolName: string | null;
  liveSaturation: number;
  liveStake: number;
  margin: number;
  poolId: Cardano.PoolId;
  ticker: string | null;
}

// Type-level `LacePartialStakePool satisfies LaceBrowsePool` : if this export fails to
// type-check, the browse UI pool shape and `LacePartialStakePool` have diverged.
type Assert<T extends LaceBrowsePool> = T;
export type Check = Assert<LacePartialStakePool>;

export interface LaceStakePool extends LacePartialStakePool {
  hexId: string;
  liveDelegators: number;
  livePledge: number;
  owners: string[];
  ros?: number;
  status?: 'active' | 'retired' | 'retiring';
  timestamp: number;
}

export interface StakePoolsNetworkData {
  activeSlotsCoefficient: number;
  desiredNumberOfPools: number;
  epochLength: number;
  liveStake: number;
  maxLovelaceSupply: number;
  monetaryExpansion: number;
  poolInfluence: number;
  reserves: number;
  retiringPools: Cardano.PoolId[];
  slotLength: number;
  timestamp: number;
}

export interface CardanoStakePoolsProvider {
  getNetworkData: (
    context: CardanoProviderContext,
  ) => Observable<Result<StakePoolsNetworkData, ProviderError>>;
  getStakePools: (
    context: CardanoProviderContext,
  ) => Observable<Result<BlockfrostPartialStakePool[], ProviderError>>;
  getStakePool: (
    poolId: Cardano.PoolId,
    context: CardanoProviderContext,
  ) => Observable<Result<BlockfrostStakePool | null, ProviderError>>;
  getMetadata: (
    poolId: Cardano.PoolId,
    context: CardanoProviderContext,
  ) => Observable<Result<BlockfrostStakePoolMetadata | null, ProviderError>>;
}

export interface CardanoStakePoolsProviderDependencies {
  cardanoStakePoolsProvider: CardanoStakePoolsProvider;
}
