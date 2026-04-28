import { isNotNil } from '@cardano-sdk/util';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
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
  BlockfrostStakePoolMetadata,
  LacePartialStakePool,
  StakePoolsNetworkData,
} from '../types';
import type { Cardano } from '@cardano-sdk/core';
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
    },
    { actions, cardanoStakePoolsProvider: { getNetworkData, getStakePools } },
  ) =>
    selectChainId$.pipe(
      filter(isNotNil),
      distinctUntilChanged(),
      withLatestFrom(selectActiveNetworkData$),
      switchMap(([chainId, networkData]) => {
        const fetchData = (delay: number): Observable<FetchDataEvent> =>
          timer(delay).pipe(
            switchMap(() => getNetworkData({ chainId })),
            switchMap(result => {
              if (result.isErr()) return of({ delay: retryDelay });

              // Emit immediately with a timestamp of 0 so that even if the app closes before
              // getStakePools completes, a new fetch will be performed the next time the app is opened.
              const data = { ...result.unwrap(), timestamp: 0 };

              return concat(
                of({ data }),
                getStakePools({ chainId }).pipe(
                  map(allResult =>
                    allResult.isErr()
                      ? { delay: retryDelay }
                      : {
                          data: { ...data, timestamp: now() },
                          delay: cacheTTL,
                          summaries: allResult
                            .unwrap()
                            .map(toLacePartialStakePool),
                        },
                  ),
                ),
              );
            }),
          );

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
    );

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
          const context = { chainId };
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

          const fetchPools = (poolId: Cardano.PoolId, delay: number) =>
            timer(delay).pipe(
              switchMap(() =>
                forkJoin({
                  pool: getStakePool(poolId, context),
                  // If the metadata is cached, use it, otherwise fetch it from the provider
                  // Do it even if cached metadata is null as in that case the provider will return null as well
                  metadata: cachedMetadata[poolId]
                    ? of(Ok(cachedMetadata[poolId]))
                    : getMetadata(poolId, context),
                }),
              ),
              map(({ pool, metadata }) =>
                pool.isErr() || metadata.isErr()
                  ? { poolId, delay: retryDelay }
                  : {
                      poolId,
                      data: toLaceStakePool({
                        metadata: metadata.unwrap(),
                        now,
                        pool: pool.unwrap(),
                        poolId: poolId,
                        retiringPools,
                      }),
                    },
              ),
            );

          return of(...poolIds).pipe(
            mergeMap(poolId =>
              (details?.[poolId]?.timestamp ?? 0) + cacheTTL > now()
                ? EMPTY
                : fetchPools(poolId, 0).pipe(
                    expand(({ delay }) =>
                      delay ? fetchPools(poolId, delay) : EMPTY,
                    ),
                    filter(({ data }) => !!data),
                    map(({ data }) => setPoolDetails({ network, pool: data! })),
                  ),
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
  (_, { cardanoStakePools: { selectPoolDetails$ } }, { actions }) =>
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
    );

export const cardanoStakePoolsSideEffects = [
  createStakePoolsNetworkData(),
  createLoadStakePool(),
  createDeleteExpiredPools(),
];
