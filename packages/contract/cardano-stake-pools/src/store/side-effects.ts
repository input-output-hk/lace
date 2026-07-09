import { isNotNil } from '@cardano-sdk/util';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { whileActive } from '@lace-contract/wallet-active-state';
import { Ok } from '@lace-sdk/util';
import {
  combineLatest,
  concat,
  distinctUntilChanged,
  EMPTY,
  expand,
  filter,
  forkJoin,
  map,
  mergeMap,
  of,
  switchMap,
  take,
  timer,
  withLatestFrom,
} from 'rxjs';

import { toLacePartialStakePool, toLaceStakePool } from './utils';

import type { SideEffect } from '../contract';
import type {
  BlockfrostPartialStakePool,
  BlockfrostStakePool,
  BlockfrostStakePoolMetadata,
  CardanoStakePoolsProvider,
  LacePartialStakePool,
  LaceStakePool,
  StakePoolsNetworkData,
} from '../types';
import type { Cardano, ProviderError } from '@cardano-sdk/core';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const HOURLY_INTERVAL = 1000 * 60 * 60; // 1 hour
const RETRY_DELAY = 1000 * 10; // 10 seconds

export interface StakePoolsSideEffectConfig {
  cacheTTL?: number;
  interval?: number;
  now?: () => number;
  retryDelay?: number;
}

interface FetchDataEvent {
  data?: StakePoolsNetworkData;
  delay?: number;
  summaries?: LacePartialStakePool[];
}

const hasData = (
  event: FetchDataEvent,
): event is FetchDataEvent & { data: StakePoolsNetworkData } => !!event.data;

interface NetworkDataFetchDeps {
  cacheTTL: number;
  chainId: Cardano.ChainId;
  getNetworkData: CardanoStakePoolsProvider['getNetworkData'];
  getStakePools: CardanoStakePoolsProvider['getStakePools'];
  now: () => number;
  retryDelay: number;
}

const toFetchDataEvent =
  (data: StakePoolsNetworkData, deps: NetworkDataFetchDeps) =>
  (
    allResult: Result<BlockfrostPartialStakePool[], ProviderError>,
  ): FetchDataEvent =>
    allResult.isErr()
      ? { delay: deps.retryDelay }
      : {
          data: { ...data, timestamp: deps.now() },
          delay: deps.cacheTTL,
          summaries: allResult.unwrap().map(toLacePartialStakePool),
        };

const handleNetworkDataResult = (
  result: Result<StakePoolsNetworkData, ProviderError>,
  deps: NetworkDataFetchDeps,
): Observable<FetchDataEvent> => {
  if (result.isErr()) return of({ delay: deps.retryDelay });

  // Emit immediately with a timestamp of 0 so that even if the app closes before
  // getStakePools completes, a new fetch will be performed the next time the app is opened.
  const data = { ...result.unwrap(), timestamp: 0 };

  return concat(
    of({ data }),
    deps
      .getStakePools({ chainId: deps.chainId })
      .pipe(map(toFetchDataEvent(data, deps))),
  );
};

const fetchStakePoolsData = (
  deps: NetworkDataFetchDeps,
  delay: number,
): Observable<FetchDataEvent> =>
  timer(delay).pipe(
    switchMap(() => deps.getNetworkData({ chainId: deps.chainId })),
    switchMap(result => handleNetworkDataResult(result, deps)),
  );

interface FetchPoolDeps {
  cachedMetadata: Record<Cardano.PoolId, BlockfrostStakePoolMetadata>;
  chainId: Cardano.ChainId;
  getMetadata: CardanoStakePoolsProvider['getMetadata'];
  getStakePool: CardanoStakePoolsProvider['getStakePool'];
  now: () => number;
  retiringPools: Cardano.PoolId[];
  retryDelay: number;
}

interface FetchPoolEvent {
  data?: LaceStakePool;
  delay?: number;
  poolId: Cardano.PoolId;
}

const toFetchPoolEvent =
  (poolId: Cardano.PoolId, deps: FetchPoolDeps) =>
  ({
    metadata,
    pool,
  }: {
    metadata: Result<BlockfrostStakePoolMetadata | null, ProviderError>;
    pool: Result<BlockfrostStakePool | null, ProviderError>;
  }): FetchPoolEvent =>
    pool.isErr() || metadata.isErr()
      ? { delay: deps.retryDelay, poolId }
      : {
          data: toLaceStakePool({
            metadata: metadata.unwrap(),
            now: deps.now,
            pool: pool.unwrap(),
            poolId,
            retiringPools: deps.retiringPools,
          }),
          poolId,
        };

const fetchPoolWithMetadata = (
  deps: FetchPoolDeps,
  poolId: Cardano.PoolId,
  delay: number,
): Observable<FetchPoolEvent> => {
  const context = { chainId: deps.chainId };
  return timer(delay).pipe(
    switchMap(() =>
      forkJoin({
        pool: deps.getStakePool(poolId, context),
        // If the metadata is cached, use it, otherwise fetch it from the provider
        // Do it even if cached metadata is null as in that case the provider will return null as well
        metadata: deps.cachedMetadata[poolId]
          ? of(Ok(deps.cachedMetadata[poolId]))
          : deps.getMetadata(poolId, context),
      }),
    ),
    map(toFetchPoolEvent(poolId, deps)),
  );
};

const fetchPoolDetailsActions = <A>(
  fetchPools: (
    poolId: Cardano.PoolId,
    delay: number,
  ) => Observable<FetchPoolEvent>,
  poolId: Cardano.PoolId,
  toAction: (pool: LaceStakePool) => A,
): Observable<A> =>
  fetchPools(poolId, 0).pipe(
    expand(({ delay }) => (delay ? fetchPools(poolId, delay) : EMPTY)),
    filter(({ data }) => !!data),
    map(({ data }) => toAction(data!)),
  );

export const createStakePoolsNetworkData =
  ({
    cacheTTL = CACHE_TTL,
    now = Date.now,
    retryDelay = RETRY_DELAY,
  }: StakePoolsSideEffectConfig = {}): SideEffect =>
  (
    _,
    {
      cardanoContext: { selectChainId$ },
      cardanoStakePools: { selectActiveNetworkData$ },
      wallets: { selectActiveNetworkAccounts$ },
    },
    {
      actions,
      cardanoStakePoolsProvider: { getNetworkData, getStakePools },
      isWalletActive$,
    },
  ) =>
    // `whileActive` MUST stay at the end of the pipe. Mid-pipeline placement
    // leaves the downstream `switchMap`'s in-flight `timer` / `expand` chain
    // alive on lock — it only blocks future outer emissions, not the
    // already-running TTL refresh cycle. See ADR 25.
    combineLatest([
      selectChainId$.pipe(filter(isNotNil), distinctUntilChanged()),
      selectActiveNetworkAccounts$.pipe(
        map(accounts =>
          accounts.some(account => account.blockchainName === 'Cardano'),
        ),
        distinctUntilChanged(),
      ),
    ]).pipe(
      // `selectActiveNetworkData$` is sampled, not reactive: dispatching
      // `setNetworkData` below mutates this slice, and re-triggering the
      // pipeline on its changes would cancel the in-flight `getStakePools`
      // and re-fire `getNetworkData` immediately (initial delay collapses to
      // zero when the just-dispatched timestamp is 0).
      withLatestFrom(selectActiveNetworkData$),
      switchMap(([[chainId, hasCardanoAccounts], networkData]) => {
        if (!hasCardanoAccounts) return EMPTY;

        const fetchDeps: NetworkDataFetchDeps = {
          cacheTTL,
          chainId,
          getNetworkData,
          getStakePools,
          now,
          retryDelay,
        };
        const fetchData = (delay: number) =>
          fetchStakePoolsData(fetchDeps, delay);

        const { setNetworkData, setPoolSummaries } = actions.cardanoStakePools;
        const network = CardanoNetworkId(chainId.networkMagic);
        const expiryTimestamp = (networkData?.timestamp ?? 0) + cacheTTL;
        const initialDelay = Math.max(0, expiryTimestamp - now());

        return fetchData(initialDelay).pipe(
          expand(({ delay }) => (delay ? fetchData(delay) : EMPTY)),
          filter(hasData),
          mergeMap(event => {
            const { data, summaries } = event;

            return concat(
              of(setNetworkData({ network, data })),
              summaries ? of(setPoolSummaries({ network, summaries })) : EMPTY,
            );
          }),
        );
      }),
      whileActive(isWalletActive$),
    );

/**
 * Loads pool details on demand when `loadPools` is dispatched.
 *
 * Not gated on `isWalletActive$` — qualifies for ADR 25's UI-action-cascade
 * pattern. `loadPools` is dispatched only from staking-related UI (pool
 * list, delegation flow); the lock screen blocks all UI interaction, so
 * this action cannot fire while locked.
 */
export const createLoadStakePool =
  ({
    cacheTTL = CACHE_TTL,
    now = Date.now,
    retryDelay = RETRY_DELAY,
  }: StakePoolsSideEffectConfig = {}): SideEffect =>
  (
    { cardanoStakePools: { loadPools$ } },
    {
      cardanoContext: { selectChainId$ },
      cardanoStakePools: {
        selectActiveNetworkData$,
        selectActivePoolDetails$,
        selectActivePoolSummaries$,
      },
    },
    { actions, cardanoStakePoolsProvider },
  ) =>
    loadPools$.pipe(
      mergeMap(loadPoolsAction =>
        combineLatest([
          selectChainId$.pipe(filter(isNotNil)),
          selectActiveNetworkData$.pipe(filter(isNotNil)),
        ]).pipe(
          take(1),
          withLatestFrom(selectActivePoolDetails$, selectActivePoolSummaries$),
          map(([[chainId, networkData], details, summaries]) => {
            return {
              chainId,
              details,
              loadPoolsAction,
              networkData,
              summaries,
            };
          }),
        ),
      ),
      mergeMap(
        ({ chainId, details, loadPoolsAction, networkData, summaries }) => {
          const { setPoolDetails } = actions.cardanoStakePools;
          const { getStakePool, getMetadata } = cardanoStakePoolsProvider;
          const network = CardanoNetworkId(chainId.networkMagic);
          const poolIds = loadPoolsAction.payload;
          const { retiringPools } = networkData;
          const cachedMetadata = (summaries ?? []).reduce(
            (accumulator, pool) => {
              const id = pool.poolId;

              if (poolIds.includes(id)) {
                const { description, poolName, ticker } = pool;
                accumulator[id] = { description, name: poolName, ticker };
              }

              return accumulator;
            },
            {} as Record<Cardano.PoolId, BlockfrostStakePoolMetadata>,
          );

          const fetchDeps: FetchPoolDeps = {
            cachedMetadata,
            chainId,
            getMetadata,
            getStakePool,
            now,
            retiringPools,
            retryDelay,
          };
          const fetchPools = (poolId: Cardano.PoolId, delay: number) =>
            fetchPoolWithMetadata(fetchDeps, poolId, delay);
          const toAction = (pool: LaceStakePool) =>
            setPoolDetails({ network, pool });

          return of(...poolIds).pipe(
            mergeMap(poolId =>
              (details?.[poolId]?.timestamp ?? 0) + cacheTTL > now()
                ? EMPTY
                : fetchPoolDetailsActions(fetchPools, poolId, toAction),
            ),
          );
        },
      ),
    );

export const createDeleteExpiredPools =
  ({
    cacheTTL = CACHE_TTL,
    interval = HOURLY_INTERVAL,
    now = Date.now,
  }: StakePoolsSideEffectConfig = {}): SideEffect =>
  (
    _,
    { cardanoStakePools: { selectPoolDetails$ } },
    { actions, isWalletActive$ },
  ) =>
    // `whileActive` MUST stay at the end of the pipe so the upstream
    // `timer(0, interval)` is torn down on lock. See ADR 25.
    timer(0, interval).pipe(
      withLatestFrom(selectPoolDetails$),
      switchMap(([, details]) => {
        const { deletePoolDetails } = actions.cardanoStakePools;
        const deleteActions: ReturnType<typeof deletePoolDetails>[] = [];

        for (const key in details) {
          const network = key as CardanoNetworkId;
          const networkDetails = details[network];

          for (const poolKey in networkDetails) {
            const poolId = poolKey as Cardano.PoolId;

            if (networkDetails[poolId].timestamp < now() - cacheTTL * 2)
              deleteActions.push(deletePoolDetails({ network, poolId }));
          }
        }

        return of(...deleteActions);
      }),
      whileActive(isWalletActive$),
    );

export const cardanoStakePoolsSideEffects = [
  createStakePoolsNetworkData(),
  createLoadStakePool(),
  createDeleteExpiredPools(),
];
