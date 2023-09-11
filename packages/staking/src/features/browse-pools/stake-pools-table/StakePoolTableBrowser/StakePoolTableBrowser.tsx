/* eslint-disable react/no-multi-comp */
import Icon from '@ant-design/icons';
import { Wallet } from '@lace/cardano';
import { getRandomIcon } from '@lace/common';
import { List, ListProps } from 'antd';
import cn from 'classnames';
import isNumber from 'lodash/isNumber';
import React, { useEffect } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { MAX_POOLS_COUNT, useDelegationPortfolioStore } from '../../../store';
import { StakePoolItemBrowser, StakePoolItemBrowserProps } from '../StakePoolItemBrowser';
import Arrow from './arrow.svg';
import styles from './StakePoolTableBrowser.module.scss';

type TranslationsFor<T extends string> = Record<T, string>;
type SortKey = 'name' | 'apy' | 'saturation';
type SortDirection = 'asc' | 'desc';

export type StakePoolSortOptions = {
  field: Wallet.SortField;
  order: SortDirection;
};

export type StakePoolTableBrowserProps = {
  scrollableTargetId: string;
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: StakePoolItemBrowserProps[];
  loadMoreData: () => void;
  total: number;
  emptyPlaceholder?: React.ReactNode | string;
  translations: TranslationsFor<'poolName' | 'apy' | 'saturation'>;
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  showSkeleton?: boolean;
} & ListProps<StakePoolItemBrowserProps>;

interface TableHeaders {
  label: string;
  value: SortKey;
}

const PoolSkeleton = () => (
  <div className={styles.skeleton} data-testid="stake-pool-skeleton">
    <div className={styles.skeletonAvatar} />
    <div className={styles.skeletonTitle} />
  </div>
);

export const StakePoolTableBrowser = ({
  scrollableTargetId,
  className,
  emptyText,
  total,
  loadMoreData,
  items,
  emptyPlaceholder = '',
  translations,
  activeSort,
  setActiveSort,
  showSkeleton,
  ...props
}: StakePoolTableBrowserProps): React.ReactElement => {
  const poolsToFetch = useDelegationPortfolioStore((state) =>
    state.selections.map(({ id }) => ({
      // Had to cast it with fromKeyHash because search uses plain ID instead of hex.
      id: Wallet.Cardano.PoolId.fromKeyHash(id as unknown as Wallet.Crypto.Ed25519KeyHashHex),
    }))
  );
  const [selectedPools, setSelectedPools] = React.useState<Wallet.Cardano.StakePool[]>([]);
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);

  const headers: TableHeaders[] = [
    { label: translations.poolName, value: 'name' },
    { label: translations.apy, value: 'apy' },
    { label: translations.saturation, value: 'saturation' },
  ];

  const { walletStoreBlockchainProvider: blockchainProvider, walletStoreWalletUICardanoCoin: cardanoCoin } =
    useOutsideHandles();

  const onSortChange = (field: SortKey) => {
    const order =
      field === activeSort?.field ? ((activeSort?.order === 'asc' ? 'desc' : 'asc') as SortDirection) : 'asc';
    setActiveSort({ field, order });
  };

  const selectedStakePools = selectedPools?.map((pool) => {
    const stakePool = Wallet.util.stakePoolTransformer({ cardanoCoin, stakePool: pool });
    const logo = getRandomIcon({ id: pool.id.toString(), size: 30 });
    const hexId = Wallet.Cardano.PoolIdHex(stakePool.hexId);

    return {
      logo,
      ...stakePool,
      hexId,
      onUnselect: () => portfolioMutators.unselectPool({ id: hexId }),
    };
  });

  useEffect(() => {
    if (poolsToFetch.length === 0) {
      setSelectedPools([]);
      return;
    }
    const selectedPoolsFilters: Wallet.QueryStakePoolsArgs = {
      filters: {
        identifier: {
          _condition: 'or',
          values: poolsToFetch,
        },
      },
      pagination: {
        limit: MAX_POOLS_COUNT,
        startAt: 0,
      },
    };
    const fetchSelectedPools = async () => {
      const { pageResults } = await blockchainProvider.stakePoolProvider.queryStakePools(selectedPoolsFilters);
      setSelectedPools(pageResults);
    };
    fetchSelectedPools();
  }, [poolsToFetch.length]);

  return (
    <div className={styles.stakepoolTable} data-testid="stake-pool-list-container">
      <div data-testid="stake-pool-list-header" className={styles.header}>
        {headers.map(({ label, value }) => (
          <div key={value} onClick={() => onSortChange(value)} data-testid={`stake-pool-list-header-${value}`}>
            <p>
              <span>{label}</span>
              <Icon
                component={Arrow}
                className={cn(
                  styles.triangle,
                  value === activeSort?.field && activeSort?.order === 'desc' ? styles.down : styles.up,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  { [styles.active!]: value === activeSort?.field }
                )}
                data-testid={`stake-pool-sort-order-${activeSort?.order}`}
              />
            </p>
          </div>
        ))}
      </div>
      <div className={styles.selectedPools}>
        {selectedStakePools?.map((pool) => (
          <StakePoolItemBrowser key={pool.id} {...pool} />
        ))}
      </div>
      {selectedStakePools?.length > 0 && <div className={styles.poolsSeparator} />}
      <div data-testid="stake-pool-list-scroll-wrapper" className={styles.wrapper}>
        {isNumber(total) && !total && emptyPlaceholder}
        <InfiniteScroll
          dataLength={items?.length || 0}
          next={loadMoreData}
          hasMore={items?.length < (total || 0)}
          loader={<PoolSkeleton />}
          scrollableTarget={scrollableTargetId}
        >
          {showSkeleton || !isNumber(total) ? (
            <PoolSkeleton />
          ) : (
            <>
              <List
                className={className}
                data-testid="stake-pool-list"
                dataSource={items}
                itemLayout="horizontal"
                locale={{ emptyText }}
                renderItem={(item: StakePoolItemBrowserProps) => (
                  <List.Item className={styles.listItemWrapper}>
                    <StakePoolItemBrowser {...item} />
                  </List.Item>
                )}
                {...props}
              />
            </>
          )}
        </InfiniteScroll>
      </div>
    </div>
  );
};
