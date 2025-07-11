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
const ONE_DAY = 86_400_000; // One day in milliseconds

// The empty text placeholders used to make the stake pools with empty names or tickers to be sorted at the end of the list
const EMPTY_TEXT_PLACEHOLDER_ASC_ORDER = '\uFFFD';
const EMPTY_TEXT_PLACEHOLDER_DESC_ORDER = '';

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

  if (stakePool) {
    if (stakePool.metrics) stakePool.metrics.livePledge = BigInt(details.live_pledge);
    stakePool.owners = details.owners;
  }
};

// eslint-disable-next-line sonarjs/cognitive-complexity
const getSorter = (sort: QueryStakePoolsArgs['sort']) => {
  if (!sort) return null;

  const { field, order } = sort;
  const asc = order === 'asc';
  const placeholder = asc ? EMPTY_TEXT_PLACEHOLDER_ASC_ORDER : EMPTY_TEXT_PLACEHOLDER_DESC_ORDER;

  switch (field) {
    case 'name':
    case 'ticker':
      return (a: Cardano.StakePool, b: Cardano.StakePool) => {
        const valueA = a.metadata?.[field] || placeholder;
        const valueB = b.metadata?.[field] || placeholder;
        return asc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      };
    case 'cost':
      return (a: Cardano.StakePool, b: Cardano.StakePool) => (asc ? Number(a.cost - b.cost) : Number(b.cost - a.cost));
    case 'margin':
      return (a: Cardano.StakePool, b: Cardano.StakePool) => {
        const marginA = Cardano.FractionUtils.toNumber(a.margin);
        const marginB = Cardano.FractionUtils.toNumber(b.margin);
        return asc ? marginA - marginB : marginB - marginA;
      };
    case 'pledge':
      return (a: Cardano.StakePool, b: Cardano.StakePool) =>
        asc ? Number(a.pledge - b.pledge) : Number(b.pledge - a.pledge);
    case 'blocks':
      return (a: Cardano.StakePool, b: Cardano.StakePool) =>
        asc
          ? (a.metrics?.blocksCreated || 0) - (b.metrics?.blocksCreated || 0)
          : (b.metrics?.blocksCreated || 0) - (a.metrics?.blocksCreated || 0);
    case 'liveStake':
      return (a: Cardano.StakePool, b: Cardano.StakePool) =>
        asc
          ? Number((a.metrics?.stake.live || BigInt(0)) - (b.metrics?.stake.live || BigInt(0)))
          : Number((b.metrics?.stake.live || BigInt(0)) - (a.metrics?.stake.live || BigInt(0)));
    case 'saturation':
      return (a: Cardano.StakePool, b: Cardano.StakePool) =>
        asc
          ? (a.metrics?.saturation || 0) - (b.metrics?.saturation || 0)
          : (b.metrics?.saturation || 0) - (a.metrics?.saturation || 0);
  }

  return null;
};

export interface StakePoolServiceProps {
  blockfrostClient: BlockfrostClient;
  extensionLocalStorage: Storage.LocalStorageArea;
}

export const initStakePoolService = (props: StakePoolServiceProps): StakePoolProvider => {
  const { blockfrostClient, extensionLocalStorage } = props;

  /**
   * `cachedData` is _usually_ always available, but not _actually_ always available.
   *
   * `initStakePoolService` is a synchronous function while reading cached data from the extension local storage is not,
   * so the methods of the returned `StakePoolProvider` may be called before the cached data is available.
   * More than this, the very first time the extension runs, the data needs to be entirely fetched.
   *
   * Storing the cached data in a `Promise` rather than a value helps us handling the cases where the cached data is not yet available.
   */
  let cachedData: Promise<StakePoolCachedData>;
  /**
   * `fetchData` may be called multiple times in short periods of time: we need to avoid fetching the data multiple times.
   *
   * This flag ensures that only one instance of `fetchData` runs at a time.
   */
  let fetchingData = false;
  let healthStatus = false;
  let index: Fuse<{ id: Cardano.PoolId }>;
  let poolDetails: StakePoolCachedData['poolDetails'] = new Map();

  const createIndex = (stakePools: Cardano.StakePool[]) => {
    const data = stakePools.map(({ id, metadata }) => {
      // metadata from BlockFrost API has more fields than required, extracting only the relevant ones to keep cache size small
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

  /**
   * Fetches all the date required to make the stake pools browsing page to work.
   * It also saves the data in the cache and builds the fuzzy index.
   *
   * This function is designed to be called in a synchronous way i.e. to propagate errors to the caller;
   * the `try`/`finally` block ensures that the `fetchingData` flag is set to `false` even if the function fails.
   */
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

  /**
   * This function is designed to be called in an _fire and forget_ way.
   * When cached data is available but expired, this function refreshes the cached data in background,
   * to let the `StakePoolProvider` continue to work, even if with old data.
   */
  const asyncFetchData = () => (fetchingData ? undefined : fetchData().catch(console.error));

  /**
   * This function is the entry point to access the cached data.
   * Each time it is used, all the checks on cache expiration are performed.
   */
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

  const init = async () => {
    const storageObject = (await extensionLocalStorage.get(CACHE_KEY)) as CachedData;
    let data = fromSerializableObject<StakePoolCachedData>(storageObject[CACHE_KEY]);

    if (!data) data = await fetchData();
    else {
      if (data.lastFetchTime < Date.now() - ONE_DAY) asyncFetchData();

      poolDetails = data.poolDetails;
      createIndex(data.stakePools);
    }

    healthStatus = true;

    return data;
  };

  cachedData = init();

  return {
    healthCheck: () => Promise.resolve({ ok: healthStatus }),
    queryStakePools,
    stakePoolStats: async () => (await getCachedData()).stats
  };
};
