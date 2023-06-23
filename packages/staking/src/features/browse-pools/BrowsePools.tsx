import { Box, Flex } from '@lace/ui';
import list from './data.json';
import { PoolsList } from './pools-list';
import { Search } from './search';

const poolsList = list.map((item) => ({
  ...item,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onClick: () => {},
}));

export const BrowsePools = () => (
  <Flex flexDirection={'column'} alignItems={'stretch'}>
    <Search />
    <Box mt={'$32'}>
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
    </Box>
  </Flex>
);
