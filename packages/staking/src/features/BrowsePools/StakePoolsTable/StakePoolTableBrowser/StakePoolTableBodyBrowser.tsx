import { List, ListProps } from 'antd';
import isNumber from 'lodash/isNumber';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { PoolSkeleton } from '../PoolSkeleton/PoolSkeleton';
import * as styles from './StakePoolTableBrowser.css';
import { StakePoolTableItemBrowserProps } from './StakePoolTableItemBrowser';

export type StakePoolTableBodyBrowserProps = {
  scrollableTargetId: string;
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: StakePoolTableItemBrowserProps[];
  loadMoreData: () => void;
  total: number;
  emptyPlaceholder?: React.ReactNode | string;
  showSkeleton?: boolean;
  listProps?: ListProps<StakePoolTableItemBrowserProps>;
  ItemRenderer: (item: StakePoolTableItemBrowserProps, index: number) => React.ReactElement;
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
}: StakePoolTableBodyBrowserProps) => (
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          renderItem={(item: StakePoolTableItemBrowserProps) => (
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
