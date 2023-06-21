import list from './data.json';
import { PoolsList } from './pools-list';
import { Search } from './search';

const poolsList = list.map((item) => ({
  ...item,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onClick: () => {},
}));

export const BrowsePools = () => (
  <>
    <Search />
    <PoolsList
      list={poolsList}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      loadMoreData={() => {}}
      totalResultCount={list.length}
      isSearching={false}
      fetchingPools={false}
      isLoadingList={false}
      scrollableTargetId={'lace-app'}
    />
  </>
);
