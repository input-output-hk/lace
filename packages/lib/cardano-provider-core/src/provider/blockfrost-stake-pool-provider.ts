import {
  ProviderError,
  ProviderFailure,
  toProviderError,
  type HttpClient,
} from '@lace-lib/util-provider';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { Cardano } from '@cardano-sdk/core';
import type { BlockfrostPartialStakePool } from '@lace-contract/cardano-stake-pools';
import type { Logger } from 'ts-log';

export class BlockfrostStakePoolProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  public async getMetadata(poolId: Cardano.PoolId) {
    try {
      const metadata = await this.request<Responses['pool_metadata']>(
        `pools/${poolId}/metadata`,
      );

      // For stake pools without metadata, Blockfrost returns an empty object.
      // This uniforms the result with response from pools/extended endpoint called by getStakePools method.
      return Object.keys(metadata).length ? metadata : null;
    } catch (error) {
      if (error instanceof ProviderError) {
        // For retired stake pools, Blockfrost returns a 404 error.
        // Ref: getStakePool method for more details.
        if (error.reason === ProviderFailure.NotFound) return null;

        throw error;
      }

      throw toProviderError(error);
    }
  }

  public async getNetworkData() {
    try {
      const [genesis, params, network, retiring] = await Promise.all([
        this.request<Responses['genesis_content']>('genesis'),
        this.request<Responses['epoch_param_content']>(
          'epochs/latest/parameters',
        ),
        this.request<Responses['network']>('network'),
        this.paginatedRequests<Responses['pool_list_retire']>({
          endpoint: 'pools/retiring',
          pageSize: 100,
        }),
      ]);

      // These values are used for statistical purposes, not for accounting purposes.
      // The precision loss of Number in exchange of the performance cost of BigInt is an acceptable compromise.
      return {
        activeSlotsCoefficient: genesis.active_slots_coefficient,
        desiredNumberOfPools: params.n_opt,
        epochLength: genesis.epoch_length,
        liveStake: Number(network.stake.live),
        maxLovelaceSupply: Number(network.supply.max),
        monetaryExpansion: params.rho,
        poolInfluence: params.a0,
        reserves: Number(network.supply.reserves),
        retiringPools: retiring.map(pool => pool.pool_id as Cardano.PoolId),
        slotLength: genesis.slot_length,
        timestamp: 0,
      };
    } catch (error) {
      throw toProviderError(error);
    }
  }

  public async getStakePool(poolId: Cardano.PoolId) {
    try {
      return await this.request<Responses['pool']>(`pools/${poolId}`);
    } catch (error) {
      if (error instanceof ProviderError) {
        // For retired stake pools, Blockfrost returns a 404 error.
        // For users with funds delegated to a retired pool, Lace will pass through this case.
        // This wraps the error in a value which will be converted in a retired pool.
        if (error.reason === ProviderFailure.NotFound) return null;

        throw error;
      }

      throw toProviderError(error);
    }
  }

  public async getStakePools() {
    try {
      return await this.paginatedRequests<BlockfrostPartialStakePool[]>({
        endpoint: 'pools/extended',
        pageSize: 100,
      });
    } catch (error) {
      throw toProviderError(error);
    }
  }
}
