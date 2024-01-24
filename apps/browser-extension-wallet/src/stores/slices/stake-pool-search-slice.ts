/* eslint-disable unicorn/no-null */
import isNumber from 'lodash/isNumber';
import { Wallet } from '@lace/cardano';
import { StateStatus, StakePoolSearchSlice, BlockchainProviderSlice, ZustandHandlers, SliceCreator } from '../types';

const defaultFetchLimit = 100;

const fetchStakePools =
  ({
    set,
    get
  }: ZustandHandlers<StakePoolSearchSlice & BlockchainProviderSlice>): StakePoolSearchSlice['fetchStakePools'] =>
  async ({ searchString, skip = 0, limit = defaultFetchLimit, sort }) => {
    const { totalResultCount: prevTotalCount, pageResults: prevPageResults } = get().stakePoolSearchResults || {};
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
      sort
    };
    const { totalResultCount, pageResults } = await get().blockchainProvider.stakePoolProvider.queryStakePools(filters);

    const stakePools: (Wallet.Cardano.StakePool | undefined)[] =
      isNumber(prevTotalCount) && totalResultCount === prevTotalCount
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
