/* eslint-disable unicorn/no-null */
import isEqual from 'lodash/isEqual';
import { Wallet } from '@lace/cardano';
import { BlockchainProviderSlice, SliceCreator, StakePoolSearchSlice, StateStatus, ZustandHandlers } from '../types';

const defaultFetchLimit = 100;

export const getQueryStakePoolsFilters = ({
  searchString,
  skip = 0,
  limit = defaultFetchLimit,
  sort
}: Parameters<StakePoolSearchSlice['fetchStakePools']>[0]): Wallet.QueryStakePoolsArgs => {
  let filtersValues: Wallet.QueryStakePoolsArgs['filters'] = {};
  try {
    const poolId: Wallet.Cardano.PoolId = Wallet.Cardano.PoolId(searchString);
    filtersValues = {
      identifier: {
        values: [{ id: poolId }]
      }
    };
  } catch {
    filtersValues = { text: searchString };
  }
  return {
    filters: {
      ...filtersValues,
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
    sort
  };
};

const fetchStakePools =
  ({
    set,
    get
  }: ZustandHandlers<StakePoolSearchSlice & BlockchainProviderSlice>): StakePoolSearchSlice['fetchStakePools'] =>
  async ({ searchString, skip = 0, limit = defaultFetchLimit, sort }) => {
    const {
      totalResultCount: prevTotalCount,
      pageResults: prevPageResults,
      searchFilters: prevSort
    } = get().stakePoolSearchResults || {};
    set({ stakePoolSearchResultsStatus: StateStatus.LOADING });

    const filters = getQueryStakePoolsFilters({ searchString, skip, limit, sort });

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
