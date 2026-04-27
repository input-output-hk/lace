import { logger } from '@cardano-sdk/util-dev';
import { ProviderError, ProviderFailure } from '@lace-lib/util-provider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostStakePoolProvider } from '../../../src/blockfrost/provider/blockfrost-stake-pool-provider';
import { mockResponses } from '../util';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { Cardano } from '@cardano-sdk/core';
import type { BlockfrostPartialStakePool } from '@lace-contract/cardano-stake-pools';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';
import type { Mock } from 'vitest';

const mockedGenesisResponse = {
  active_slots_coefficient: 0.05,
  epoch_length: 432_000,
  max_kes_evolutions: 62,
  max_lovelace_supply: '45000000000000000',
  network_magic: 764_824_073,
  security_param: 2160,
  slot_length: 1,
  slots_per_kes_period: 129_600,
  system_start: 1_506_203_091,
  update_quorum: 5,
} as Responses['genesis_content'];

const mockedEpochParams = {
  epoch: 225,
  min_fee_a: 44,
  min_fee_b: 155_381,
  max_block_size: 65_536,
  max_tx_size: 16_384,
  max_block_header_size: 1100,
  key_deposit: '2000000',
  pool_deposit: '500000000',
  e_max: 18,
  n_opt: 500,
  a0: 0.3,
  rho: 0.003,
  tau: 0.2,
  decentralisation_param: 0.5,
  extra_entropy: null,
  protocol_major_ver: 8,
  protocol_minor_ver: 0,
  min_utxo: '1000000',
  min_pool_cost: '340000000',
  nonce: '0000000000000000000000000000000000000000000000000000000000000000',
} as Responses['epoch_param_content'];

const mockedNetworkResponse = {
  stake: {
    active: '1060378314781343',
    live: '15001884895856815',
  },
  supply: {
    circulating: '42064399450423723',
    locked: '6161981104458',
    max: '45000000000000000',
    total: '40267211394073980',
    reserves: '1000000000000000',
  },
} as Responses['network'];

const mockPoolMetadata: Responses['pool_metadata'] = {
  pool_id: 'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
  hex: '74f5dd2551c2c0fd71aebb95e1f58d0b742c0fd2ff1712644f709bdc',
  url: 'https://angelstakepool.net/preprod/angel.json',
  hash: 'bf44709dd714742688eeff2b6ca5573fe312a2e5f49d564c4c2311923c63952c',
  ticker: 'ANGEL',
  name: 'ANGEL stake pool',
  description: 'ANGEL pool at pre-production',
  homepage: 'https://www.angelstakepool.net',
};

const mockPool: Responses['pool'] = {
  pool_id: 'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
  hex: '74f5dd2551c2c0fd71aebb95e1f58d0b742c0fd2ff1712644f709bdc',
  vrf_key: '7cc0d9a8931e434c5632d5a696a2c50483d7ed86f4f2e97e558f14e863a2ccbf',
  blocks_minted: 20_790,
  blocks_epoch: 59,
  live_stake: '1712965165147',
  live_size: 0.0031914222843913106,
  live_saturation: 0.027118732920817557,
  live_delegators: 89,
  active_stake: '1711746053958',
  active_size: 0.0029191527359677025,
  declared_pledge: '44400000000',
  live_pledge: '204285793860',
  margin_cost: 0.22,
  fixed_cost: '777000000',
  reward_account:
    'stake_test1uzn083tm8erradk0lwzzkegewdtwj6mukk2ep2r03g9j87g0020y2',
  owners: ['stake_test1uzn083tm8erradk0lwzzkegewdtwj6mukk2ep2r03g9j87g0020y2'],
  registration: [
    'ec46ebbe69288a007df2a9fd1dc173cfe5fd679e00c8ed9f652ac2c190d1ceb5',
  ],
  retirement: [],
  calidus_key: null,
};

describe('BlockfrostStakePoolProvider', () => {
  let clientMock: { request: Mock };
  let loggerMock: Logger;
  let provider: BlockfrostStakePoolProvider;

  beforeEach(() => {
    clientMock = {
      request: vi.fn(),
    };
    loggerMock = logger;

    provider = new BlockfrostStakePoolProvider(
      clientMock as unknown as HttpClient,
      loggerMock,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getNetworkData', () => {
    it('aggregates genesis, epoch params, network and retiring pools', async () => {
      const mockRetiring: Responses['pool_list_retire'] = [
        {
          pool_id: 'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
          epoch: 157,
        },
        {
          pool_id: 'pool1mp96jpc2dtaruz0cazmljh03dev0969c4rq3wr6hnc4rjdxn8aw',
          epoch: 158,
        },
      ];

      mockResponses(clientMock.request, [
        ['genesis', { data: mockedGenesisResponse }],
        ['epochs/latest/parameters', { data: mockedEpochParams }],
        ['network', { data: mockedNetworkResponse }],
        ['pools/retiring?page=1&count=100', { data: mockRetiring }],
      ]);

      const result = await provider.getNetworkData();

      expect(result).toEqual({
        activeSlotsCoefficient: mockedGenesisResponse.active_slots_coefficient,
        desiredNumberOfPools: mockedEpochParams.n_opt,
        epochLength: mockedGenesisResponse.epoch_length,
        liveStake: Number(mockedNetworkResponse.stake.live),
        maxLovelaceSupply: Number(mockedNetworkResponse.supply.max),
        monetaryExpansion: mockedEpochParams.rho,
        poolInfluence: mockedEpochParams.a0,
        reserves: Number(mockedNetworkResponse.supply.reserves),
        retiringPools: [
          'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
          'pool1mp96jpc2dtaruz0cazmljh03dev0969c4rq3wr6hnc4rjdxn8aw',
        ] as Cardano.PoolId[],
        slotLength: mockedGenesisResponse.slot_length,
        timestamp: 0,
      });

      expect(clientMock.request).toHaveBeenCalledWith('genesis', undefined);
      expect(clientMock.request).toHaveBeenCalledWith(
        'epochs/latest/parameters',
        undefined,
      );
      expect(clientMock.request).toHaveBeenCalledWith('network', undefined);
      expect(clientMock.request).toHaveBeenCalledWith(
        'pools/retiring?page=1&count=100',
        undefined,
      );
    });

    it('fetches a second retiring page when the first page is full', async () => {
      const retiringEntry = {
        pool_id:
          'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222' as Cardano.PoolId,
        epoch: 100,
      };
      const fullPage: Responses['pool_list_retire'] = Array.from(
        { length: 100 },
        () => retiringEntry,
      );
      const secondPage: Responses['pool_list_retire'] = [
        {
          pool_id:
            'pool1mp96jpc2dtaruz0cazmljh03dev0969c4rq3wr6hnc4rjdxn8aw' as Cardano.PoolId,
          epoch: 101,
        },
      ];

      mockResponses(clientMock.request, [
        ['genesis', { data: mockedGenesisResponse }],
        ['epochs/latest/parameters', { data: mockedEpochParams }],
        ['network', { data: mockedNetworkResponse }],
        ['pools/retiring?page=1&count=100', { data: fullPage }],
        ['pools/retiring?page=2&count=100', { data: secondPage }],
      ]);

      const result = await provider.getNetworkData();

      expect(result.retiringPools).toHaveLength(101);
      expect(result.retiringPools[100]).toBe(
        'pool1mp96jpc2dtaruz0cazmljh03dev0969c4rq3wr6hnc4rjdxn8aw',
      );
    });
  });

  describe('getStakePool', () => {
    it('returns pool details from Blockfrost', async () => {
      const poolId =
        'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222' as Cardano.PoolId;

      mockResponses(clientMock.request, [
        [`pools/${poolId}`, { data: mockPool }],
      ]);

      const result = await provider.getStakePool(poolId);

      expect(result).toEqual(mockPool);
      expect(clientMock.request).toHaveBeenCalledWith(
        `pools/${poolId}`,
        undefined,
      );
    });

    it('returns null when the pool is not found', async () => {
      const poolId =
        'pool1missing00000000000000000000000000000000000000000000000000' as Cardano.PoolId;

      mockResponses(clientMock.request, [
        [
          `pools/${poolId}`,
          new ProviderError(ProviderFailure.NotFound, new Error('not found')),
        ],
      ]);

      const result = await provider.getStakePool(poolId);

      expect(result).toBeNull();
    });
  });

  describe('getMetadata', () => {
    it('returns metadata when Blockfrost returns a non-empty object', async () => {
      const poolId =
        'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222' as Cardano.PoolId;

      mockResponses(clientMock.request, [
        [`pools/${poolId}/metadata`, { data: mockPoolMetadata }],
      ]);

      const result = await provider.getMetadata(poolId);

      expect(result).toEqual(mockPoolMetadata);
    });

    it('returns null when Blockfrost returns an empty metadata object', async () => {
      const poolId =
        'pool1empty0000000000000000000000000000000000000000000000000000' as Cardano.PoolId;

      mockResponses(clientMock.request, [
        [`pools/${poolId}/metadata`, { data: {} }],
      ]);

      const result = await provider.getMetadata(poolId);

      expect(result).toBeNull();
    });

    it('returns null when metadata is not found', async () => {
      const poolId =
        'pool1nometa000000000000000000000000000000000000000000000000000' as Cardano.PoolId;

      mockResponses(clientMock.request, [
        [
          `pools/${poolId}/metadata`,
          new ProviderError(ProviderFailure.NotFound, new Error('not found')),
        ],
      ]);

      const result = await provider.getMetadata(poolId);

      expect(result).toBeNull();
    });
  });

  describe('getStakePools', () => {
    it('returns pools from pools/extended with pagination', async () => {
      const extendedPool: BlockfrostPartialStakePool = {
        pool_id: 'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
        active_stake: '1711746053958',
        blocks_minted: 20_790,
        declared_pledge: '44400000000',
        fixed_cost: '777000000',
        live_saturation: 0.027118732920817557,
        live_stake: '1712965165147',
        margin_cost: 0.22,
        metadata: mockPoolMetadata,
      };

      mockResponses(clientMock.request, [
        ['pools/extended?page=1&count=100', { data: [extendedPool] }],
      ]);

      const result = await provider.getStakePools();

      expect(result).toEqual([extendedPool]);
      expect(clientMock.request).toHaveBeenCalledWith(
        'pools/extended?page=1&count=100',
        undefined,
      );
    });

    it('requests the next page when the first page has count items', async () => {
      const extendedRow: BlockfrostPartialStakePool = {
        pool_id: 'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
        active_stake: '1',
        blocks_minted: 0,
        declared_pledge: '0',
        fixed_cost: '0',
        live_saturation: 0,
        live_stake: '0',
        margin_cost: 0,
        metadata: null,
      };
      const fullPage: BlockfrostPartialStakePool[] = Array.from(
        { length: 100 },
        () => extendedRow,
      );
      const tail: BlockfrostPartialStakePool = {
        pool_id: 'pool1tail00000000000000000000000000000000000000000000000000',
        active_stake: '1',
        blocks_minted: 0,
        declared_pledge: '0',
        fixed_cost: '0',
        live_saturation: 0,
        live_stake: '0',
        margin_cost: 0,
        metadata: null,
      };

      mockResponses(clientMock.request, [
        ['pools/extended?page=1&count=100', { data: fullPage }],
        ['pools/extended?page=2&count=100', { data: [tail] }],
      ]);

      const result = await provider.getStakePools();

      expect(result).toHaveLength(101);
      expect(result[100]).toEqual(tail);
    });
  });
});
