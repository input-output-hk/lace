import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { toCorePool } from '../src/stake-pools';

import type { BlockFrostPool } from '../src/stake-pools';
import type { Responses } from '@blockfrost/blockfrost-js';

describe('toCorePool', () => {
  const basePool: BlockFrostPool = {
    pool_id: 'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
    hex: '74f5dd2551c2c0fd71aebb95e1f58d0b742c0fd2ff1712644f709bdc',
    vrf_key: '7cc0d9a8931e434c5632d5a696a2c50483d7ed86f4f2e97e558f14e863a2ccbf',
    blocks_minted: 20790,
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
    owners: [
      'stake_test1uzn083tm8erradk0lwzzkegewdtwj6mukk2ep2r03g9j87g0020y2',
    ],
    registration: [
      'ec46ebbe69288a007df2a9fd1dc173cfe5fd679e00c8ed9f652ac2c190d1ceb5',
    ],
    retirement: [],
    calidus_key: null,
    metadata: {
      url: 'https://angelstakepool.net/preprod/angel.json',
      hash: 'bf44709dd714742688eeff2b6ca5573fe312a2e5f49d564c4c2311923c63952c',
      ticker: 'ANGEL',
      name: 'ANGEL stake pool',
      description: 'ANGEL pool at pre-production',
      homepage: 'https://www.angelstakepool.net',
    } as Responses['pool_metadata'],
  };

  describe('owners', () => {
    it('should map owners array to RewardAccount array', () => {
      const pool = { ...basePool };
      const result = toCorePool(pool);

      expect(result.owners).toHaveLength(1);
      expect(result.owners[0]).toBe(
        'stake_test1uzn083tm8erradk0lwzzkegewdtwj6mukk2ep2r03g9j87g0020y2',
      );
    });

    it('should return empty array when owners is undefined', () => {
      const pool = { ...basePool };
      delete (pool as Partial<BlockFrostPool>).owners;
      const result = toCorePool(pool as BlockFrostPool);

      expect(result.owners).toEqual([]);
    });

    it('should return empty array when owners is null', () => {
      const pool = { ...basePool, owners: null as unknown as string[] };
      const result = toCorePool(pool);

      expect(result.owners).toEqual([]);
    });

    it('should return empty array when owners is empty array', () => {
      const pool = { ...basePool, owners: [] };
      const result = toCorePool(pool);

      expect(result.owners).toEqual([]);
    });

    it('should handle multiple owners', () => {
      const pool = {
        ...basePool,
        owners: [
          'stake_test1uzn083tm8erradk0lwzzkegewdtwj6mukk2ep2r03g9j87g0020y2',
          'stake_test1uzn083tm8erradk0lwzzkegewdtwj6mukk2ep2r03g9j87g0020y2',
        ],
      };
      const result = toCorePool(pool);

      expect(result.owners).toHaveLength(2);
      expect(result.owners[0]).toBe(
        'stake_test1uzn083tm8erradk0lwzzkegewdtwj6mukk2ep2r03g9j87g0020y2',
      );
      expect(result.owners[1]).toBe(
        'stake_test1uzn083tm8erradk0lwzzkegewdtwj6mukk2ep2r03g9j87g0020y2',
      );
    });
  });

  describe('integration', () => {
    it('should convert a complete pool with all fields', () => {
      const result = toCorePool(basePool);

      expect(result.id).toBe(basePool.pool_id);
      expect(result.hexId).toBe(basePool.hex);
      expect(result.cost).toBe(BigInt(basePool.fixed_cost));
      expect(result.pledge).toBe(BigInt(basePool.declared_pledge));
      expect(result.owners).toHaveLength(1);
      expect(result.metadata).toEqual(basePool.metadata);
      expect(result.status).toBe(Cardano.StakePoolStatus.Active);
    });

    it('should handle pool without owners field', () => {
      const poolWithoutOwners = { ...basePool };
      delete (poolWithoutOwners as { owners?: unknown }).owners;
      const result = toCorePool(poolWithoutOwners);

      expect(result.owners).toEqual([]);
      expect(result.pledge).toBe(BigInt(basePool.declared_pledge));
    });
  });
});
