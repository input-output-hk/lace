/* eslint-disable camelcase */
/* eslint-disable unicorn/no-array-callback-reference */
/* eslint-disable unicorn/no-null */

import { BlockfrostClient } from '@cardano-sdk/cardano-services-client';
import { Cardano, Paginated, QueryStakePoolsArgs, StakePoolProvider, StakePoolStats } from '@cardano-sdk/core';
import { fromSerializableObject, toSerializableObject } from '@cardano-sdk/util';
import { Storage } from 'webextension-polyfill';
import type { Responses } from '@blockfrost/blockfrost-js';
import Fuse from 'fuse.js';

const BF_API_PAGE_SIZE = 100;
const CACHE_KEY = 'stake-pool-service-data';
const EMPTY_TEXT_PLACEHOLDER = '\uFFFD';
const ONE_DAY = 86_400_000; // One day in milliseconds

const FUZZY_SEARCH_OPTIONS = {
  distance: 255,
  fieldNormWeight: 1,
  ignoreFieldNorm: false,
  keys: [
    { name: 'description', weight: 4 },
    { name: 'homepage', weight: 1 },
    { name: 'name', weight: 6 },
    { name: 'id', weight: 1 },
    { name: 'ticker', weight: 10 }
  ],
  location: 0,
  minMatchCharLength: 1,
  threshold: 0.3,
  useExtendedSearch: false,
  weights: { description: 4, homepage: 1, name: 6, poolId: 1, ticker: 10 }
};

// API response actually includes more attributes than Responses['pool_list_extended']
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
  metadata?: {
    hash: string;
    url: string;
    ticker: string;
    name: string;
    description: string;
    homepage: string;
  };
}

interface StakePoolCachedData {
  lastFetchTime: number;
  poolDetails: Map<Cardano.PoolId, { details: Responses['pool']; lastFetchTime: number }>;
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

type IdentifierType = Required<Required<QueryStakePoolsArgs>['filters']>['identifier'];

const filterByIdentifier = (identifier: IdentifierType) => (pool: Cardano.StakePool) =>
  identifier.values.some((value) => {
    if (value.id) return pool.id === value.id;

    return value.name
      ? pool.metadata?.name.toLowerCase() === value.name.toLowerCase()
      : pool.metadata?.ticker.toLowerCase() === value.ticker?.toLowerCase();
  });

const enrichStakePool = (stakePools: Cardano.StakePool[], id: Cardano.PoolId, details: Responses['pool']) => {
  const stakePool = stakePools.find((pool) => pool.id === id);

  if (stakePool && stakePool.metrics) stakePool.metrics.livePledge = BigInt(details.live_pledge);
};

// eslint-disable-next-line sonarjs/cognitive-complexity, complexity
const getSorter = (sort: QueryStakePoolsArgs['sort']) => {
  if (!sort) return null;

  const { field, order } = sort;

  if (order === 'asc') {
    switch (field) {
      case 'name':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => {
          const nameA = a.metadata?.name || EMPTY_TEXT_PLACEHOLDER;
          const nameB = b.metadata?.name || EMPTY_TEXT_PLACEHOLDER;
          return nameA.localeCompare(nameB);
        };
      case 'ticker':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => {
          const tickerA = a.metadata?.ticker || EMPTY_TEXT_PLACEHOLDER;
          const tickerB = b.metadata?.ticker || EMPTY_TEXT_PLACEHOLDER;
          return tickerA.localeCompare(tickerB);
        };
      case 'cost':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => Number(a.cost - b.cost);
      case 'margin':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => {
          const marginA = Cardano.FractionUtils.toNumber(a.margin);
          const marginB = Cardano.FractionUtils.toNumber(b.margin);
          return marginA - marginB;
        };
      case 'pledge':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => Number(a.pledge - b.pledge);
      case 'blocks':
        return (a: Cardano.StakePool, b: Cardano.StakePool) =>
          (a.metrics?.blocksCreated || 0) - (b.metrics?.blocksCreated || 0);
      case 'liveStake':
        return (a: Cardano.StakePool, b: Cardano.StakePool) =>
          Number((a.metrics?.stake.live || BigInt(0)) - (b.metrics?.stake.live || BigInt(0)));
      case 'saturation':
        return (a: Cardano.StakePool, b: Cardano.StakePool) =>
          (a.metrics?.saturation || 0) - (b.metrics?.saturation || 0);
    }
  } else {
    switch (field) {
      case 'name':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => {
          const nameA = a.metadata?.name || '';
          const nameB = b.metadata?.name || '';
          return nameB.localeCompare(nameA);
        };
      case 'ticker':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => {
          const tickerA = a.metadata?.ticker || '';
          const tickerB = b.metadata?.ticker || '';
          return tickerB.localeCompare(tickerA);
        };
      case 'cost':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => Number(b.cost - a.cost);
      case 'margin':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => {
          const marginA = Cardano.FractionUtils.toNumber(a.margin);
          const marginB = Cardano.FractionUtils.toNumber(b.margin);
          return marginB - marginA;
        };
      case 'pledge':
        return (a: Cardano.StakePool, b: Cardano.StakePool) => Number(b.pledge - a.pledge);
      case 'blocks':
        return (a: Cardano.StakePool, b: Cardano.StakePool) =>
          (b.metrics?.blocksCreated || 0) - (a.metrics?.blocksCreated || 0);
      case 'liveStake':
        return (a: Cardano.StakePool, b: Cardano.StakePool) =>
          Number((b.metrics?.stake.live || BigInt(0)) - (a.metrics?.stake.live || BigInt(0)));
      case 'saturation':
        return (a: Cardano.StakePool, b: Cardano.StakePool) =>
          (b.metrics?.saturation || 0) - (a.metrics?.saturation || 0);
    }
  }

  return null;
};

export interface StakePoolServiceProps {
  blockfrostClient: BlockfrostClient;
  extensionLocalStorage: Storage.LocalStorageArea;
}

export const initStakePoolService = (props: StakePoolServiceProps): StakePoolProvider => {
  const { blockfrostClient, extensionLocalStorage } = props;

  let cachedData: Promise<StakePoolCachedData>;
  let fetchingData = false;
  let healthStatus = false;
  let index: Fuse<{ id: Cardano.PoolId }>;
  let poolDetails: StakePoolCachedData['poolDetails'] = new Map();

  const createIndex = (stakePools: Cardano.StakePool[]) => {
    const data = stakePools.map(({ id, metadata }) => {
      const { description, homepage, name, ticker } = metadata || {};

      return { description, homepage, id, name, ticker };
    });

    index = new Fuse(data, FUZZY_SEARCH_OPTIONS, Fuse.createIndex(FUZZY_SEARCH_OPTIONS.keys, data));
  };

  const saveData = async (data: StakePoolCachedData) => {
    await extensionLocalStorage.set({ [CACHE_KEY]: toSerializableObject(data) });
    cachedData = Promise.resolve(data);
  };

  const fetchPages = async (firstPage = 1): Promise<Cardano.StakePool[]> => {
    const url = `pools/extended?count=${BF_API_PAGE_SIZE}&page=${firstPage}`;
    const response = await blockfrostClient.request<BlockFrostPool[]>(url);
    const nextPages = response.length === BF_API_PAGE_SIZE ? fetchPages(firstPage + 1) : Promise.resolve([]);
    const stakePools = response.map(toCore);

    return [...stakePools, ...(await nextPages)];
  };

  const fetchData = async (): Promise<StakePoolCachedData> => {
    fetchingData = true;

    let data: StakePoolCachedData;

    try {
      const stakePools = await fetchPages();
      const retiringPools = await blockfrostClient.request<Responses['pool_list_retire']>('pools/retiring');
      const retiringPoolIds = new Set(retiringPools.map(({ pool_id }) => pool_id));

      for (const pool of stakePools) if (retiringPoolIds.has(pool.id)) pool.status = Cardano.StakePoolStatus.Retiring;
      for (const [poolId, { details }] of poolDetails) enrichStakePool(stakePools, poolId, details);

      // TODO
      // LW-13053
      // Compute ROS

      const active = stakePools.length - retiringPools.length;
      data = {
        lastFetchTime: Date.now(),
        poolDetails,
        stakePools,
        stats: { qty: { activating: 0, active, retired: 0, retiring: retiringPools.length } }
      };

      createIndex(stakePools);
      await saveData(data);
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

      for (const [poolId, { lastFetchTime }] of poolDetails)
        if (lastFetchTime < Date.now() - ONE_DAY) poolDetails.delete(poolId);
    } finally {
      if (!data || data.lastFetchTime < Date.now() - ONE_DAY) asyncFetchData();
    }

    return data;
  };

  const queryStakePools = async (args: QueryStakePoolsArgs): Promise<Paginated<Cardano.StakePool>> => {
    const data = await getCachedData();
    const { stakePools } = data;
    const { filters, pagination, sort } = args;
    const { identifier, pledgeMet, text } = filters || {};
    const sorter = getSorter(sort);

    if (identifier) {
      for (const { id } of identifier.values)
        if (id && !poolDetails.has(id)) {
          const details = await blockfrostClient.request<Responses['pool']>(`pools/${id}`);

          poolDetails.set(id, { details, lastFetchTime: Date.now() });
          enrichStakePool(stakePools, id, details);
        }

      await saveData({ ...data, poolDetails });
    }

    let result = identifier && !text ? stakePools.filter(filterByIdentifier(identifier)) : [...stakePools];

    // This mitigates the lack of live pledge in the BF bulk API response
    // If the live stake is lower than the declared pledge, the pledge is not met as well
    if (pledgeMet) result = result.filter((pool) => pool.pledge <= (pool.metrics?.stake.live || BigInt(0)));

    if (text) {
      const fuzzy = index.search(text);
      const idMap = new Map(result.map((pool) => [pool.id, pool]));

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result = fuzzy.filter(({ item: { id } }) => idMap.has(id)).map(({ item: { id } }) => idMap.get(id)!);
    }

    if (sorter) result.sort(sorter);

    return {
      totalResultCount: result.length,
      pageResults: result.slice(pagination.startAt, pagination.startAt + pagination.limit)
    };
  };

  cachedData = new Promise<StakePoolCachedData>(async (resolve, reject) => {
    try {
      const storageObject = (await extensionLocalStorage.get(CACHE_KEY)) as CachedData;
      let data = fromSerializableObject<StakePoolCachedData>(storageObject[CACHE_KEY]);

      if (!data) data = await fetchData();
      else {
        if (data.lastFetchTime < Date.now() - ONE_DAY) asyncFetchData();

        poolDetails = data.poolDetails;
        createIndex(data.stakePools);
      }

      healthStatus = true;
      resolve(data);
    } catch (error) {
      console.error('init error', error);

      reject(error);
    }
  });

  return {
    healthCheck: () => Promise.resolve({ ok: healthStatus }),
    queryStakePools,
    stakePoolStats: async () => (await getCachedData()).stats
  };
};
