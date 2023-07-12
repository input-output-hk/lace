import { StakePoolSortOptions, Wallet } from '@lace/cardano';
import { Box, Flex } from '@lace/ui';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StakePoolDetails } from '../drawer';
import { stakePoolsMock } from '../stake-pools';
import { Sections, useStakePoolDetails } from '../store';
import { Search } from './search';
import { StakePoolsTable } from './stake-pools-table';

const DEFAULT_SORT_OPTIONS: StakePoolSortOptions = {
  field: 'name',
  order: 'asc',
};
const searchDebounce = 300;
const mockFetchDelay = 500;

const fetchStakePools = async ({
  searchString,
  sort,
}: {
  searchString: string;
  skip?: number;
  limit?: number;
  sort?: StakePoolSortOptions;
}) =>
  new Promise<Wallet.Cardano.StakePool[]>((resolve) => {
    setTimeout(() => {
      const data = stakePoolsMock.filter((pool) => pool.metadata?.name.includes(searchString));

      if (!sort) return resolve(data);

      const dataSorted =
        sort.field === 'name'
          ? // mock data is already sorted
            data
          : sort.field === 'saturation'
          ? // @ts-ignore
            data.sort((poolA, poolB) => poolA.metrics.saturation - poolB.metrics.saturation)
          : // @ts-ignore
            data.sort((poolA, poolB) => poolA[sort.field] - poolB[sort.field]);

      return sort.order === 'asc' ? resolve(dataSorted) : resolve(dataSorted.reverse());
    }, mockFetchDelay);
  });

const stepsWithBackBtn = new Set([Sections.CONFIRMATION, Sections.SIGN]);

const stepsWithExitConfirmation = new Set([Sections.CONFIRMATION, Sections.SIGN, Sections.FAIL_TX]);

export const BrowsePools = () => {
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [sort, setSort] = useState<StakePoolSortOptions>(DEFAULT_SORT_OPTIONS);
  const [searchValue, setSearchValue] = useState<string>('');
  const { setIsDrawerVisible, setSection } = useStakePoolDetails();

  const [stakePools, setStakePools] = useState<Wallet.StakePoolSearchResults['pageResults']>([]);
  const [{ pageResults, totalResultCount }, setStakePoolSearchResults] = useState<Wallet.StakePoolSearchResults>({
    pageResults: [],
    totalResultCount: 0,
  });

  const onSearch = (searchString: string) => {
    setIsSearching(true);
    setSearchValue(searchString);
  };
  const [fetchingPools, setFetchingPools] = useState(false);
  // TODO: compute real value
  const hasNoFunds = false;

  const onStake = useCallback(() => {
    // TODO: LW-7396 enable StakeConfirmation modal in the flow in the case of restaking
    // if (isDelegating) {
    //   setStakeConfirmationVisible(true);
    //   return;
    // }

    setSection();
    setIsDrawerVisible(true);
  }, [setIsDrawerVisible, setSection]);

  const debouncedSearch = useMemo(
    () =>
      debounce((...args: Parameters<typeof fetchStakePools>) => {
        setFetchingPools(true);
        // eslint-disable-next-line promise/catch-or-return
        fetchStakePools(...args).then((pools) => {
          setStakePoolSearchResults({
            pageResults: pools,
            totalResultCount: pools.length,
          });
          setFetchingPools(false);
          setIsSearching(false);
        });
      }, searchDebounce),
    []
  );

  useEffect(() => {
    // Close pool details drawer & fetch pools on mount, network switching, searchValue change and sort change
    setIsLoadingList(true);
    setIsDrawerVisible(false);
    // @ts-ignore
    debouncedSearch({ searchString: searchValue, sort });
  }, [searchValue, sort, debouncedSearch, setIsDrawerVisible]);

  useEffect(() => {
    // Update stake pool list and new offset position
    setStakePools(pageResults);
    setIsLoadingList(false);
  }, [pageResults]);

  return (
    <Flex flexDirection={'column'} alignItems={'stretch'}>
      <Search onChange={onSearch} loading={fetchingPools} />
      <Box mt={'$32'}>
        <StakePoolsTable
          stakePools={stakePools}
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          loadMoreData={() => {}}
          totalResultCount={totalResultCount}
          isSearching={isSearching}
          fetchingPools={fetchingPools}
          isLoadingList={isLoadingList}
          scrollableTargetId={'lace-app'}
          sort={sort}
          setSort={setSort}
        />
      </Box>
      <StakePoolDetails
        showCloseIcon
        showBackIcon={(section: Sections): boolean => stepsWithBackBtn.has(section)}
        showExitConfirmation={(section: Sections): boolean => stepsWithExitConfirmation.has(section)}
        canDelegate={!hasNoFunds}
        onStake={onStake}
      />
    </Flex>
  );
};
