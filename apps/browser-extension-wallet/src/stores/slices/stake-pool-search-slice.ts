/* eslint-disable unicorn/no-null */
import isEqual from 'lodash/isEqual';
import { Wallet } from '@lace/cardano';
import { BlockchainProviderSlice, SliceCreator, StakePoolSearchSlice, StateStatus, ZustandHandlers } from '../types';

const defaultFetchLimit = 100;

const fetchStakePools =
  ({
    set,
    get
  }: ZustandHandlers<StakePoolSearchSlice & BlockchainProviderSlice>): StakePoolSearchSlice['fetchStakePools'] =>
  async ({ searchString, skip = 0, limit = defaultFetchLimit, sort }) => {
    const { totalResultCount: prevTotalCount, pageResults: prevPageResults } = get().stakePoolSearchResults || {};
    const prevSort = get().stakePoolSearchResults.searchFilters;
    set({ stakePoolSearchResultsStatus: StateStatus.LOADING });

    let filtersValues = [];
    try {
      const poolId: Wallet.Cardano.PoolId = Wallet.Cardano.PoolId(searchString);
      filtersValues = [{ id: poolId }];
    } catch {
      filtersValues = [{ name: searchString }, { ticker: searchString }];
    }
    const filters: Wallet.QueryStakePoolsArgs = {
      filters: {
        ...(searchString && {
          identifier: {
            _condition: 'or',
            values: filtersValues
          }
        }),
        pledgeMet: true,
        status: [
          Wallet.Cardano.StakePoolStatus.Active,
          Wallet.Cardano.StakePoolStatus.Activating,
          Wallet.Cardano.StakePoolStatus.Retiring
        ]
      },
      pagination: {
        startAt: skip,
        limit: limit - skip + 1
      },
      // @ts-expect-error TODO remove when ticker sort is available; https://input-output.atlassian.net/browse/LW-9981
      sort: sort && {
        ...sort,
        ...(sort.field === 'ticker' ? { field: 'name' } : {})
      }
    };
    const { totalResultCount, pageResults } = await get().blockchainProvider.stakePoolProvider.queryStakePools(filters);

    const paginating = isEqual(prevSort, sort) && prevTotalCount === totalResultCount;
    const stakePools: (Wallet.Cardano.StakePool | undefined)[] = paginating
      ? [...prevPageResults]
      : Array.from({ length: totalResultCount });

    if (pageResults.length > 0) {
      stakePools.splice(skip, pageResults?.length, ...pageResults);
    }

    set({
      stakePoolSearchResults: {
        totalResultCount,
        pageResults: stakePools,
        skip,
        limit,
        searchQuery: searchString,
        searchFilters: sort
      },
      stakePoolSearchResultsStatus: StateStatus.LOADED
    });
  };

/**
 * has all stakepool search related actions and states
 */
export const stakePoolSearchSlice: SliceCreator<BlockchainProviderSlice & StakePoolSearchSlice, StakePoolSearchSlice> =
  ({ set, get }) => ({
    stakePoolSearchResults: { pageResults: [], totalResultCount: null },
    stakePoolSearchResultsStatus: StateStatus.IDLE,
    selectedStakePool: undefined,
    fetchStakePools: fetchStakePools({ set, get }),
    resetStakePools: () =>
      set(() => ({
        stakePoolSearchResults: { pageResults: [], totalResultCount: null },
        stakePoolSearchResultsStatus: StateStatus.IDLE
      })),
    setSelectedStakePool: (pool) => set(() => ({ selectedStakePool: pool }))
  });
