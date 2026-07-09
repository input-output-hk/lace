import { Cardano } from '@cardano-sdk/core';
import { BehaviorSubject, config as rxjsConfig } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emptyFuseSearchState, FuseSearch } from '../../src/utils/fuseSearch';

import type {
  LacePartialStakePool,
  Selectors,
  StakePoolsNetworkData,
} from '@lace-contract/cardano-stake-pools';
import type { StateObservables } from '@lace-contract/module';
import type { Observable } from 'rxjs';

const mockPool: LacePartialStakePool = {
  activeStake: 1_000_000,
  blocks: 100,
  cost: 340_000_000,
  declaredPledge: 0,
  description: 'Test pool',
  liveSaturation: 0.5,
  liveStake: 10_000_000,
  margin: 0.01,
  poolId: Cardano.PoolId(
    'pool19yzqr3meksnvzdxh5xf6aknfhldyqdj7eaquxgcjva4mzt5kg3v',
  ),
  poolName: 'Test Pool',
  ticker: 'TEST',
};

const mockNetworkData: StakePoolsNetworkData = {
  activeSlotsCoefficient: 0.05,
  desiredNumberOfPools: 500,
  epochLength: 432_000,
  liveStake: 20_000_000_000_000,
  maxLovelaceSupply: 45_000_000_000_000_000,
  monetaryExpansion: 0.003,
  poolInfluence: 0.3,
  reserves: 10_000_000_000_000_000,
  retiringPools: [],
  slotLength: 1,
  timestamp: 1_700_000_000_000,
};

const createSlice = (
  summaries$: Observable<LacePartialStakePool[] | undefined>,
  networkData$: Observable<StakePoolsNetworkData | undefined>,
): StateObservables<Selectors>['cardanoStakePools'] =>
  ({
    selectActivePoolSummaries$: summaries$,
    selectActiveNetworkData$: networkData$,
  } as unknown as StateObservables<Selectors>['cardanoStakePools']);

describe('FuseSearch.connect', () => {
  // Capture RxJS unhandled-error reporting so the migration-race test
  // can assert that no error escapes the subscriber. The legacy
  // implementation threw `Impossible undefined networkData` inside the
  // subscriber, which RxJS surfaces via `config.onUnhandledError` on the
  // next microtask (and Sentry picks up in production).
  const originalOnUnhandledError = rxjsConfig.onUnhandledError;
  let onUnhandledError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onUnhandledError = vi.fn();
    rxjsConfig.onUnhandledError = onUnhandledError;
    // RxJS reports unhandled errors via `setTimeout(0)` — fake timers
    // let the tests flush that microtask deterministically.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    rxjsConfig.onUnhandledError = originalOnUnhandledError;
  });

  it('indexes pools when both poolSummaries and networkData are defined', () => {
    const summaries$ = new BehaviorSubject<LacePartialStakePool[] | undefined>([
      mockPool,
    ]);
    const networkData$ = new BehaviorSubject<StakePoolsNetworkData | undefined>(
      mockNetworkData,
    );
    const fuse = new FuseSearch();

    fuse.connect(createSlice(summaries$, networkData$));

    expect(fuse.fuse$.value.isLoading).toBe(false);
    expect(fuse.fuse$.value.pools).toHaveLength(1);
    expect(fuse.fuse$.value.totalPoolsCount).toBe(1);
  });

  it('emits empty state when poolSummaries is undefined', () => {
    const summaries$ = new BehaviorSubject<LacePartialStakePool[] | undefined>(
      undefined,
    );
    const networkData$ = new BehaviorSubject<StakePoolsNetworkData | undefined>(
      mockNetworkData,
    );
    const fuse = new FuseSearch();

    fuse.connect(createSlice(summaries$, networkData$));

    expect(fuse.fuse$.value).toEqual(emptyFuseSearchState);
  });

  // Reproduces the v1→v2 migration race documented in
  // packages/module/migrate-v1-data: after the network-persist-key fix
  // (cherry-pick f544f9f62), users land on mainnet while
  // `cardanoStakePools` may briefly have `poolSummaries[mainnet]` defined
  // before `networkData[mainnet]` is repopulated by
  // `createStakePoolsNetworkData`. The legacy implementation throws
  // `Impossible undefined networkData` inside the subscriber — RxJS
  // surfaces this as an unhandled error (captured by Sentry in
  // production). The fix must observe partial state silently.
  it('does not throw when poolSummaries arrives before networkData (migration race)', () => {
    const summaries$ = new BehaviorSubject<LacePartialStakePool[] | undefined>([
      mockPool,
    ]);
    const networkData$ = new BehaviorSubject<StakePoolsNetworkData | undefined>(
      undefined,
    );
    const fuse = new FuseSearch();

    fuse.connect(createSlice(summaries$, networkData$));
    vi.runAllTimers(); // flush RxJS unhandled-error setTimeout(0)

    // While networkData is still loading, the search should be in
    // loading state and no error must escape the subscriber.
    expect(fuse.fuse$.value).toEqual(emptyFuseSearchState);
    expect(onUnhandledError).not.toHaveBeenCalled();

    // networkData arrives a moment later (e.g. setNetworkData with
    // timestamp: 0 from `createStakePoolsNetworkData`).
    networkData$.next(mockNetworkData);
    vi.runAllTimers();

    // The subscriber must still be alive and process the now-consistent
    // state — still no errors reported.
    expect(fuse.fuse$.value.isLoading).toBe(false);
    expect(fuse.fuse$.value.pools).toHaveLength(1);
    expect(fuse.fuse$.value.totalPoolsCount).toBe(1);
    expect(onUnhandledError).not.toHaveBeenCalled();
  });

  // When switching to a network with no cached data, both selectors emit
  // `undefined`. The UI must reset to the loading placeholder rather than
  // continue showing pools from the previous network.
  it('resets to empty state when switching to a network without cached data', () => {
    const summaries$ = new BehaviorSubject<LacePartialStakePool[] | undefined>([
      mockPool,
    ]);
    const networkData$ = new BehaviorSubject<StakePoolsNetworkData | undefined>(
      mockNetworkData,
    );
    const fuse = new FuseSearch();

    fuse.connect(createSlice(summaries$, networkData$));

    expect(fuse.fuse$.value.isLoading).toBe(false);

    // Network switch: both selectors transition to undefined.
    summaries$.next(undefined);
    networkData$.next(undefined);

    expect(fuse.fuse$.value).toEqual(emptyFuseSearchState);
  });
});
