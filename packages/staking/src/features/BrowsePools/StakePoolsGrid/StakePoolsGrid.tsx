import { Wallet } from '@lace/cardano';
import { PostHogAction } from '@lace/common';
import { Box, Text } from '@lace/ui';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';
import { StakePoolCard } from '../StakePoolCard';
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

const getMetricValueByType = (pool: StakePoolTableItemBrowserProps, metricType: MetricType) => {
  switch (metricType) {
    case 'liveStake':
      return pool.liveStake;
    case 'pledge':
      return pool.pledge;
    case 'blocks':
      return pool.blocks;
    case 'cost':
      return pool.cost;
    case 'margin':
      return pool.margin;
    default:
      // eslint-disable-next-line unicorn/no-useless-undefined, consistent-return
      return undefined;
  }
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
  const { t } = useTranslation();
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
    // TODO: replace with StakePoolCard Skeletons
    return <Skeleton active avatar />;
  }

  if (totalResultCount === 0) {
    return <StakePoolsTableEmpty />;
  }

  return (
    <div>
      {selectedStakePools.length > 0 && (
        <>
          <Box my="$16">
            <Text.Body.Normal weight="$bold">
              {t('browsePools.header.poolsCount', { poolsCount: selectedStakePools.length })}
            </Text.Body.Normal>
          </Box>
          <Box className={styles.grid}>
            {selectedStakePools.map((pool) => (
              <StakePoolCard
                key={pool.ticker}
                metricType={metricType}
                metricValue={getMetricValueByType(pool, metricType)}
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
              metricValue={getMetricValueByType(pool, metricType)}
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
