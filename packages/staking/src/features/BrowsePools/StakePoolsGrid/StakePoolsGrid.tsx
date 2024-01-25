import { Wallet } from '@lace/cardano';
import { PostHogAction } from '@lace/common';
import { Box, Flex } from '@lace/ui';
import { Skeleton } from 'antd';
import get from 'lodash/get';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';
import { StakePoolCard, StakePoolCardSkeleton } from '../StakePoolCard';
import { MetricType } from '../StakePoolCard/types';
import { StakePoolsTableEmpty } from '../StakePoolsTable/StakePoolsTableEmpty/StakePoolsTableEmpty';
import { StakePoolTableItemBrowserProps } from '../StakePoolsTable/StakePoolTableBrowser/types';
import * as styles from './StakePoolsGrid.css';

type StakePoolsGridProps = {
  scrollableTargetId: string;
  sortField: Wallet.SortField;
  loadMoreData: () => Promise<void>;
  list: StakePoolTableItemBrowserProps[];
  hasMoreData: boolean;
  loading: boolean;
  totalResultCount: number;
};

const metricTypesBySortField: Record<Wallet.SortField, MetricType> = {
  apy: 'ros',
  cost: 'cost',
  name: 'ticker',
  saturation: 'saturation',
};

export const StakePoolsGrid = ({
  totalResultCount,
  sortField,
  list: items,
  scrollableTargetId,
  loadMoreData,
  hasMoreData,
  loading,
}: StakePoolsGridProps) => {
  // TODO duplication - should be lifted to Browse Pools
  const { analytics } = useOutsideHandles();
  const { portfolioMutators, portfolioPools } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    portfolioPools: store.selectedPortfolio.map(({ id }) => ({
      // Had to cast it with fromKeyHash because search uses plain ID instead of hex.
      id: Wallet.Cardano.PoolId.fromKeyHash(id as unknown as Wallet.Crypto.Ed25519KeyHashHex),
    })),
  }));
  const createHandleClick = (pool: StakePoolTableItemBrowserProps) => () => {
    portfolioMutators.executeCommand({ data: pool.stakePool, type: 'ShowPoolDetailsFromList' });
    // TODO update the events for grid
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailClick);
  };

  const selectedStakePools = items.filter((item) => portfolioPools.find((pool) => pool.id.toString() === item.id));
  const availableStakePools = items.filter((item) => !selectedStakePools.some((pool) => pool.id === item.id));

  const metricType = metricTypesBySortField[sortField];

  if (loading) {
    return (
      <Flex
        style={{
          flexWrap: 'wrap',
        }}
      >
        {[...Array.from({ length: 3 }).keys()].map((key, index) => (
          <Flex w="$214" alignItems="center" justifyContent="center" key={key} gap="$20">
            <StakePoolCardSkeleton index={index} />
          </Flex>
        ))}
      </Flex>
    );
  }

  if (totalResultCount === 0) {
    return <StakePoolsTableEmpty />;
  }

  return (
    <div>
      {selectedStakePools.length > 0 && (
        <>
          <Box className={styles.grid}>
            {selectedStakePools.map((pool) => (
              <StakePoolCard
                key={pool.ticker}
                metricType={metricType}
                metricValue={get(pool, metricType)}
                saturation={pool.saturation}
                title={pool.ticker}
                onClick={createHandleClick(pool)}
                selected
              />
            ))}
          </Box>
          <Box className={styles.separator} />
        </>
      )}
      <InfiniteScroll
        scrollableTarget={scrollableTargetId}
        next={loadMoreData}
        hasMore={hasMoreData}
        // TODO: replace with StakePoolCard Skeletons
        loader={<Skeleton active avatar />}
        dataLength={availableStakePools.length}
      >
        <div className={styles.grid} data-testid="stake-pool-grid">
          {availableStakePools.map((pool) => (
            <StakePoolCard
              key={pool.ticker}
              metricType={metricType}
              metricValue={get(pool, metricType)}
              saturation={pool.saturation}
              title={pool.ticker}
              onClick={createHandleClick(pool)}
            />
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
};
