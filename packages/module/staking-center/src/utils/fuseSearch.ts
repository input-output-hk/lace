import Fuse from 'fuse.js';
import { BehaviorSubject, combineLatest } from 'rxjs';

import type {
  LacePartialStakePool,
  Selectors,
  StakePoolsNetworkData,
} from '@lace-contract/cardano-stake-pools';
import type { StateObservables } from '@lace-contract/module';

const FUSE_SEARCH_OPTIONS = {
  fieldNormWeight: 1,
  keys: [
    { name: 'description', weight: 4 },
    { name: 'poolName', weight: 6 },
    { name: 'poolId', weight: 1 },
    { name: 'ticker', weight: 10 },
  ],
  threshold: 0.3,
};

export interface FuseSearchState {
  /** Whether the system is still loading the stake pools */
  isLoading: boolean;
  /** The list of stake pools eligible for delegation */
  pools: LacePartialStakePool[];
  /** The function to perform the fuse search */
  search: (query: string) => LacePartialStakePool[];
  /** The total number of stake pools before any filter is applied */
  totalPoolsCount: number;
}

const emptyFuseSearchState: FuseSearchState = {
  isLoading: true,
  pools: [],
  search: () => [],
  totalPoolsCount: 0,
};

class FuseSearch {
  public readonly fuse$ = new BehaviorSubject(emptyFuseSearchState);

  public connect(slice: StateObservables<Selectors>['cardanoStakePools']) {
    return combineLatest([
      slice.selectActivePoolSummaries$,
      slice.selectActiveNetworkData$,
    ]).subscribe(([list, networkData]) => {
      if (list) {
        if (!networkData) throw new Error('Impossible undefined networkData');
        this.makeIndex(list, networkData);
      } else this.fuse$.next(emptyFuseSearchState);
    });
  }

  private makeIndex(
    list: LacePartialStakePool[],
    networkData: StakePoolsNetworkData,
  ) {
    const pools = list.filter(
      ({ declaredPledge, liveStake, poolId }) =>
        // Blockfrost bulk API doesn't provide the live pledge: we know we can't filter out by live pledge
        // We need to settle on this filter
        liveStake >= declaredPledge &&
        // Filter out retiring stake pools
        !networkData.retiringPools.includes(poolId),
    );

    const fuse = new Fuse(
      pools,
      FUSE_SEARCH_OPTIONS,
      Fuse.createIndex(FUSE_SEARCH_OPTIONS.keys, pools),
    );

    this.fuse$.next({
      isLoading: false,
      pools,
      search: (query: string) => fuse.search(query).map(({ item }) => item),
      totalPoolsCount: list.length,
    });
  }
}

/** Wired from `initialize-view.ts` with `createStateObservables` + UI store. */
export const fuseSearch = new FuseSearch();
