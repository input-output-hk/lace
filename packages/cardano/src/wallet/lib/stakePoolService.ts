// cSpell:ignore delegators
/* eslint-disable camelcase */
/* eslint-disable unicorn/no-array-callback-reference */

import { BlockfrostClient } from '@cardano-sdk/cardano-services-client';
import {
  Cardano,
  Paginated,
  QueryStakePoolsArgs,
  StakePoolProvider,
  StakePoolSortOptions,
  StakePoolStats
} from '@cardano-sdk/core';
import { fromSerializableObject, toSerializableObject } from '@cardano-sdk/util';
import { Storage } from 'webextension-polyfill';
import type { Responses } from '@blockfrost/blockfrost-js';
import Fuse from 'fuse.js';

const BF_API_PAGE_SIZE = 100;
export const CACHE_KEY = 'stake-pool-service-data';
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
  poolDetails: Map<Cardano.PoolId, Responses['pool']>;
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
    if (stakePool.metrics) {
      stakePool.metrics.livePledge = BigInt(details.live_pledge);
      stakePool.metrics.delegators = details.live_delegators;
    }
    stakePool.owners = details.owners;
  }
};

type Sorter = (a: Cardano.StakePool, b: Cardano.StakePool) => number;
type SorterCreator = (asc: boolean, field: StakePoolSortOptions['field'], placeholder: string) => Sorter;

const createSorterByText: SorterCreator = (asc, field, placeholder) => {
  if (field !== 'name' && field !== 'ticker') throw new Error('Invalid field');

  return (a, b) => {
    const valueA = a.metadata?.[field] || placeholder;
    const valueB = b.metadata?.[field] || placeholder;
    return asc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
  };
};

const createSorterByCost: SorterCreator = (asc) => (a, b) => asc ? Number(a.cost - b.cost) : Number(b.cost - a.cost);

const createSorterByMargin: SorterCreator = (asc) => (a, b) => {
  const marginA = Cardano.FractionUtils.toNumber(a.margin);
  const marginB = Cardano.FractionUtils.toNumber(b.margin);
  return asc ? marginA - marginB : marginB - marginA;
};

const createSorterByPledge: SorterCreator = (asc) => (a, b) =>
  asc ? Number(a.pledge - b.pledge) : Number(b.pledge - a.pledge);

const createSorterByBlocks: SorterCreator = (asc) => (a, b) =>
  asc
    ? (a.metrics?.blocksCreated || 0) - (b.metrics?.blocksCreated || 0)
    : (b.metrics?.blocksCreated || 0) - (a.metrics?.blocksCreated || 0);

const createSorterByLiveStake: SorterCreator = (asc) => (a, b) =>
  asc
    ? Number((a.metrics?.stake.live || BigInt(0)) - (b.metrics?.stake.live || BigInt(0)))
    : Number((b.metrics?.stake.live || BigInt(0)) - (a.metrics?.stake.live || BigInt(0)));

const createSorterBySaturation: SorterCreator = (asc) => (a, b) =>
  asc
    ? (a.metrics?.saturation || 0) - (b.metrics?.saturation || 0)
    : (b.metrics?.saturation || 0) - (a.metrics?.saturation || 0);

const sorterFactoryMap = new Map<StakePoolSortOptions['field'], SorterCreator>([
  ['name', createSorterByText],
  ['ticker', createSorterByText],
  ['cost', createSorterByCost],
  ['margin', createSorterByMargin],
  ['pledge', createSorterByPledge],
  ['blocks', createSorterByBlocks],
  ['liveStake', createSorterByLiveStake],
  ['saturation', createSorterBySaturation]
]);

const getSorter = (sort: Exclude<QueryStakePoolsArgs['sort'], undefined>): Sorter => {
  const { field, order } = sort;
  const asc = order === 'asc';
  const placeholder = asc ? EMPTY_TEXT_PLACEHOLDER_ASC_ORDER : EMPTY_TEXT_PLACEHOLDER_DESC_ORDER;
  const factory = sorterFactoryMap.get(field);

  if (!factory) throw new Error(`${field}: Sort field not supported`);

  return factory(asc, field, placeholder);
};

interface StakePoolServiceProps {
  blockfrostClient: BlockfrostClient;
  extensionLocalStorage: Storage.LocalStorageArea;
}

/**
 * Initializes the stake pool service and synchronously returns the `StakePoolProvider` instance.
 *
 * Since BF does not offer a filtering / search API, the adopted solution is to fetch all the data at once from BF bulk API
 * and to use a client side `StakePoolProvider` accessing this data to provide responses.
 *
 * This function must be synchronous (i.e. the methods of the returned `StakePoolProvider` can be called right after this function returns)
 * while its init sequence requires async operations, this means `StakePoolProvider` methods may be called before the service is initialized.
 *
 * Due to this architecture, errors thrown by the init sequence can't be propagated to the caller of this function (they may happen later
 * than this function returned), so they are propagated to the `StakePoolProvider` methods.
 *
 * Likely all `StakePoolProvider` methods are async, so they behave as follows:
 * - if they are called once the init sequence is complete, they immediately return;
 * - if they are called before the init sequence is complete, they must wait for the init sequence to complete before returning;
 * - if they are called before the init sequence is complete **and** there is an error, they throw the error happened in the init sequence
 *   as soon as it happens;
 * - if they are called after the init sequence is complete with error **and** before the stake pool service has the occasion to recover it,
 *   they immediately re-throw the same error;
 * - if they are called after the stake pool service recovers from errors, they immediately return.
 *
 * Another important aspect to keep in mind is that the bulk BF API does not return all stake pool data Lace needs, but only the subset
 * enough to make the _Browse pools_ page to work. It is responsibility of `StakePoolProvider.queryStakePools` to fetch (and cache)
 * the missing data when it is called querying stake pools by id.
 */
export const initStakePoolService = (props: StakePoolServiceProps): StakePoolProvider => {
  const { blockfrostClient, extensionLocalStorage } = props;

  /**
   * Storing `cachedData` in a `Promise` rather than in a value is the key to handle the cases where the `StakePoolProvider` methods are
   * called before the init sequence completes.
   *
   * It is initialized at the end of `initStakePoolService` with the statement `cachedData = init()`, so, next, the `StakePoolProvider`
   * methods, simply with the statement `await cachedData`, achieve all the targets they need:
   * - if the init sequence is not complete, the methods wait for the `Promise` to resolve or reject;
   * - if the init sequence completed with success, the `Promise` resolves to the cached data;
   * - if the init sequence completed with error, the `Promise` rejects with the same error which is propagated to the `StakePoolProvider`
   *   method caller.
   */
  let cachedData: Promise<StakePoolCachedData>;
  let fetchingData = false;
  let healthStatus = false;
  let fuzzyIndex: Fuse<{ id: Cardano.PoolId }>;

  const createFuzzyIndex = (stakePools: Cardano.StakePool[]) => {
    const data = stakePools.map(({ id, metadata }) => {
      // metadata from BlockFrost API has more fields than required, extracting only the relevant ones to keep cache size small
      const { description, homepage, name, ticker } = metadata || {};

      return { description, homepage, id, name, ticker };
    });

    fuzzyIndex = new Fuse(data, FUZZY_SEARCH_OPTIONS, Fuse.createIndex(FUZZY_SEARCH_OPTIONS.keys, data));
  };

  const saveData = (data: StakePoolCachedData) => {
    // Save data in a fire and forget way.
    // Errors while saving data should not prevent the StakePoolProvider from working.
    extensionLocalStorage.set({ [CACHE_KEY]: toSerializableObject(data) }).catch(console.error);
  };

  const fetchPages = async (firstPage = 1): Promise<Cardano.StakePool[]> => {
    const url = `pools/extended?count=${BF_API_PAGE_SIZE}&page=${firstPage}`;
    const response = await blockfrostClient.request<BlockFrostPool[]>(url);
    const nextPages = response.length === BF_API_PAGE_SIZE ? fetchPages(firstPage + 1) : Promise.resolve([]);
    const stakePools = response.map(toCore);

    return [...stakePools, ...(await nextPages)];
  };

  /**
   * Fetches all the data required to make the _Browse pools_ page to work.
   * It also saves the data in the cache and builds the fuzzy index.
   *
   * This function is designed to be called in a synchronous way i.e. to propagate errors to the caller;
   * the `try` / `finally` block ensures that the `fetchingData` flag is set to `false` even if the function fails.
   *
   * This way, the very first time the extension runs and the data needs to be entirely fetched, the `init` function can wait
   * till data is fetched or propagate errors while fetching data to the `StakePoolProvider` methods simply calling `await fetchData()`.
   *
   * This function is the one called to recover from errors or to refresh the cached data as well. Since the entire fetching process
   * takes between 30" and 1', in such cases it can't be called synchronously, that would mean to make the extension to hang for a long time.
   * In such cases it must be called in a fire and forget way (i.e. in background) using the form `fetchData().catch(console.error)` to both
   * log the error and to avoid unhandled rejections. This lets the `StakePoolProvider` methods to work even if with the expired cache.
   */
  const fetchData = async (): Promise<StakePoolCachedData> => {
    // Ensures that only one instance of `fetchData` runs at a time
    if (fetchingData) return cachedData;
    fetchingData = true;

    let data: StakePoolCachedData;

    try {
      const stakePools = await fetchPages();
      const retiringPools = await blockfrostClient.request<Responses['pool_list_retire']>('pools/retiring');
      const retiringPoolIds = new Set(retiringPools.map(({ pool_id }) => pool_id));

      for (const pool of stakePools) if (retiringPoolIds.has(pool.id)) pool.status = Cardano.StakePoolStatus.Retiring;

      // TODO
      // LW-13053
      // Compute ROS

      const active = stakePools.length - retiringPools.length;
      data = {
        lastFetchTime: Date.now(),
        poolDetails: new Map(),
        stakePools,
        stats: { qty: { activating: 0, active, retired: 0, retiring: retiringPools.length } }
      };

      createFuzzyIndex(stakePools);
      saveData(data);
      cachedData = Promise.resolve(data);
      healthStatus = true;
    } finally {
      fetchingData = false;
    }

    return data;
  };

  /**
   * In `cachedData` description is explained that `StakePoolProvider` methods achieve the desired behavior thanks to the `await cachedData`
   * statement. Actually, `StakePoolProvider` methods do not call that statement directly, but they use this function which centralizes
   * all the logic to access the cached data.
   *
   * Each time it is used, in case of need of error recovery or cache expiration, the data is fetched in a fire and forget way to recover
   * from errors or to refresh the cached data.
   */
  const getCachedData = async () => {
    let data: StakePoolCachedData | undefined;

    try {
      data = await cachedData;
    } finally {
      if (!data || data.lastFetchTime < Date.now() - ONE_DAY) fetchData().catch(console.error);
    }

    return data;
  };

  const queryStakePools = async (args: QueryStakePoolsArgs): Promise<Paginated<Cardano.StakePool>> => {
    const data = await getCachedData();
    const { poolDetails, stakePools } = data;
    const { filters, pagination, sort } = args;
    const { identifier, pledgeMet, text } = filters || {};

    // Check if some pool is queried by id
    if (identifier) {
      for (const { id } of identifier.values)
        if (id && !poolDetails.has(id)) {
          // If the pool is queried by id and details are not present in the cache, fetch them
          const details = await blockfrostClient.request<Responses['pool']>(`pools/${id}`);

          poolDetails.set(id, details);
          enrichStakePool(stakePools, id, details);
          saveData(data);
        }
    }

    let result = identifier && !text ? stakePools.filter(filterByIdentifier(identifier)) : [...stakePools];

    // This mitigates the lack of live pledge in the BF bulk API response
    // If the live stake is lower than the declared pledge, the pledge is not met as well
    if (pledgeMet) result = result.filter((pool) => pool.pledge <= (pool.metrics?.stake.live || BigInt(0)));

    if (text) {
      const fuzzyResult = fuzzyIndex.search(text);
      const idMap = new Map(result.map((pool) => [pool.id, pool]));

      result = fuzzyResult.map(({ item: { id } }) => idMap.get(id)).filter(Boolean) as Cardano.StakePool[];
    }

    if (sort) result.sort(getSorter(sort));

    return {
      totalResultCount: result.length,
      pageResults: result.slice(pagination.startAt, pagination.startAt + pagination.limit)
    };
  };

  const init = async () => {
    const storageObject = (await extensionLocalStorage.get(CACHE_KEY)) as CachedData;
    let data = fromSerializableObject<StakePoolCachedData>(storageObject[CACHE_KEY]);

    // The very first time the extension runs, nothing can be done rather than fetching the data synchronously.
    // In this case there is no need to create the index, because it will be created by `fetchData` function.
    if (!data) data = await fetchData();
    else {
      // If the cache is present but expired, fetch the data in a fire and forget way.
      if (data.lastFetchTime < Date.now() - ONE_DAY) fetchData().catch(console.error);

      // If the cache is present, create the index to make the fuzzy search to work against cached data.
      // The fuzzy index is an in memory Fuse object which can't be serialized and saved in the local storage with the cache.
      createFuzzyIndex(data.stakePools);
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
