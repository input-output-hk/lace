import { List, ListProps } from 'antd';
import isNumber from 'lodash/isNumber';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { PoolSkeleton } from '../PoolSkeleton/PoolSkeleton';
import { StakePoolItemBrowserProps } from '../StakePoolItemBrowser';
import * as styles from './StakePoolTableBrowser.css';

export type StakePoolTableBodyBrowser = {
  scrollableTargetId: string;
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: StakePoolItemBrowserProps[];
  loadMoreData: () => void;
  total: number;
  emptyPlaceholder?: React.ReactNode | string;
  showSkeleton?: boolean;
  listProps?: ListProps<StakePoolItemBrowserProps>;
  ItemRenderer: (data: StakePoolItemBrowserProps) => React.ReactElement;
};

export const StakePoolTableBodyBrowser = ({
  scrollableTargetId,
  className,
  emptyText,
  total,
  loadMoreData,
  items,
  emptyPlaceholder = '',
  showSkeleton,
  listProps,
  ItemRenderer,
}: StakePoolTableBodyBrowser) => (
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
        <List
          className={className}
          data-testid="stake-pool-list"
          dataSource={items}
          itemLayout="horizontal"
          locale={{ emptyText }}
          renderItem={(item: StakePoolItemBrowserProps) => (
            <List.Item className={styles.listItemWrapper}>
              <ItemRenderer {...item} />
            </List.Item>
          )}
          {...listProps}
        />
      )}
    </InfiniteScroll>
  </div>
);
