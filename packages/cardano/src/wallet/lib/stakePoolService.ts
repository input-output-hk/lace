/* eslint-disable camelcase */
/* eslint-disable unicorn/no-array-callback-reference */

/* eslint-disable no-console */

import { BlockfrostClient } from '@cardano-sdk/cardano-services-client';
import { Cardano, Paginated, QueryStakePoolsArgs, StakePoolProvider, StakePoolStats } from '@cardano-sdk/core';
import { fromSerializableObject, toSerializableObject } from '@cardano-sdk/util';
import { Storage } from 'webextension-polyfill';
// import type { Responses } from '@blockfrost/blockfrost-js';
// type gino = Responses["pool"]

const BF_API_PAGE_SIZE = 100;
const CACHE_KEY = 'stake-pool-service-data';
const ONE_DAY = 86_400_000; // One day in milliseconds

interface BlockFrostPool {
  pool_id: string;
  hex: string;
  active_stake: string;
  live_stake: string;
  live_saturation: number;
  blocks_minted: number;
  margin_cost: number;
  fixed_cost: string;
  declared_pledge: string;
  metadata: {
    hash: string;
    url: string;
    ticker: string;
    name: string;
    description: string;
    homepage: string;
  };
}

interface BlockFrostRetiringPool {
  pool_id: string;
  epoch: number;
}

interface StakePoolCachedData {
  lastFetchTime: number;
  stakePools: Cardano.StakePool[];
  stats: StakePoolStats;
}

type CachedData = { [key in typeof CACHE_KEY]: StakePoolCachedData };

const toCore = (pool: BlockFrostPool): Cardano.StakePool => ({
  cost: BigInt(pool.fixed_cost),
  hexId: pool.hex as Cardano.PoolIdHex,
  id: pool.pool_id as Cardano.PoolId,
  margin: Cardano.FractionUtils.toFraction(pool.margin_cost),
  metadata: pool.metadata,
  metrics: {
    blocksCreated: pool.blocks_minted,
    delegators: 0,
    livePledge: BigInt(0),
    saturation: pool.live_saturation,
    size: { active: 0, live: 0 },
    stake: { active: BigInt(pool.active_stake), live: BigInt(pool.live_stake) },
    lastRos: 0,
    ros: 0
  },
  owners: [],
  pledge: BigInt(pool.declared_pledge),
  relays: [],
  rewardAccount: '' as Cardano.RewardAccount,
  status: Cardano.StakePoolStatus.Active,
  vrf: '' as Cardano.VrfVkHex
});

export interface StakePoolServiceProps {
  blockfrostClient: BlockfrostClient;
  extensionLocalStorage: Storage.LocalStorageArea;
}

export const initStakePoolService = (props: StakePoolServiceProps): StakePoolProvider => {
  const { blockfrostClient, extensionLocalStorage } = props;

  let cachedData: Promise<StakePoolCachedData>;
  let fetchingData = false;
  let healthStatus = false;

  const fetchPages = async (firstPage = 1): Promise<Cardano.StakePool[]> => {
    const url = `pools/extended?count=${BF_API_PAGE_SIZE}&page=${firstPage}`;
    const response = await blockfrostClient.request<BlockFrostPool[]>(url);
    const nextPages = response.length === BF_API_PAGE_SIZE ? fetchPages(firstPage + 1) : Promise.resolve([]);
    const stakePools = response.map(toCore);

    console.log(`Fetched page ${firstPage}`, stakePools);

    return [...stakePools, ...(await nextPages)];
  };

  const fetchData = async (): Promise<StakePoolCachedData> => {
    fetchingData = true;

    let data: StakePoolCachedData;

    try {
      console.log('Going to fetch pools');
      const stakePools = await fetchPages();
      console.log('Pools fetched', stakePools);
      const retiringPools = await blockfrostClient.request<BlockFrostRetiringPool[]>('pools/retiring');
      console.log('bf1', retiringPools);
      const retiringPoolIds = new Set(retiringPools.map(({ pool_id }) => pool_id));

      for (const pool of stakePools) if (retiringPoolIds.has(pool.id)) pool.status = Cardano.StakePoolStatus.Retiring;

      // TODO
      // LW-13053
      // Compute ROS

      const active = stakePools.length - retiringPools.length;
      data = {
        lastFetchTime: Date.now(),
        stakePools,
        stats: { qty: { activating: 0, active, retired: 0, retiring: retiringPools.length } }
      };

      await extensionLocalStorage.set({ [CACHE_KEY]: toSerializableObject(data) });
      cachedData = Promise.resolve(data);
      healthStatus = true;
    } finally {
      fetchingData = false;
    }

    return data;
  };

  const asyncFetchData = () => (fetchingData ? undefined : fetchData().catch(console.error));

  const getCachedData = async () => {
    let data: StakePoolCachedData | undefined;

    try {
      data = await cachedData;
    } finally {
      if (!data || data.lastFetchTime < Date.now() - ONE_DAY) asyncFetchData();
    }

    return data;
  };

  const queryStakePools: (args: QueryStakePoolsArgs) => Promise<Paginated<Cardano.StakePool>> = () =>
    Promise.resolve({ totalResultCount: 0, pageResults: [] });

  cachedData = new Promise<StakePoolCachedData>(async (resolve, reject) => {
    try {
      const storageObject = (await extensionLocalStorage.get(CACHE_KEY)) as CachedData;
      let data = fromSerializableObject<StakePoolCachedData>(storageObject[CACHE_KEY]);

      console.log('init', data);

      if (!data) data = await fetchData();
      else if (data.lastFetchTime < Date.now() - ONE_DAY) asyncFetchData();

      console.log('init completed', data);

      healthStatus = true;
      resolve(data);
    } catch (error) {
      console.log('init error', error);

      reject(error);
    }
  });

  return {
    healthCheck: () => Promise.resolve({ ok: healthStatus }),
    queryStakePools,
    stakePoolStats: async () => (await getCachedData()).stats
  };
};
