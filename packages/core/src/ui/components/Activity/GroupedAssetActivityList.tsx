import { List, Skeleton, Typography, Button } from 'antd';
import cn from 'classnames';
import React, { useState, useEffect } from 'react';
import InfiniteScroll, { Props as InfiniteScrollProps } from 'react-infinite-scroll-component';
import { AssetActivityList, AssetActivityListProps } from './AssetActivityList';
import styles from './AssetActivityList.module.scss';
import take from 'lodash/take';
import isNumber from 'lodash/isNumber';

const { Text } = Typography;

export interface GroupedAssetActivityListProps {
  lists: AssetActivityListProps[];
  infitineScrollProps?: Partial<InfiniteScrollProps>;
  withTitle?: {
    title: string;
    onClick?: () => void;
    clickLabel?: string;
  };
  isDrawerView?: boolean;
}

export const GroupedAssetActivityList = ({
  lists,
  infitineScrollProps,
  withTitle,
  isDrawerView
}: GroupedAssetActivityListProps): React.ReactElement => {
  const TAKE = 5;
  const FAKE_LOAD_TIMEOUT = 1000;
  const [skip, setSkip] = useState(0);
  const [paginatedLists, setPaginatedLists] = useState(take(lists, skip + TAKE));

  const loadMoreData = () => {
    setTimeout(() => {
      setSkip(skip + TAKE);
    }, FAKE_LOAD_TIMEOUT);
  };

  useEffect(() => {
    if (lists.length === 0) return;
    setPaginatedLists(take(lists, skip + TAKE));
  }, [skip, lists]);

  return (
    <InfiniteScroll
      dataLength={paginatedLists.length}
      next={loadMoreData}
      hasMore={paginatedLists.length < lists.length}
      loader={
        <div data-testid="infinite-scroll-skeleton">
          <Skeleton active avatar />
        </div>
      }
      {...infitineScrollProps}
      className={cn(styles.infitineScroll, { [styles.isDrawerView]: isDrawerView })}
    >
      {isNumber(lists.length) ? (
        <List
          className={cn(styles.activityContainer, { [styles.isDrawerView]: isDrawerView })}
          data-testid="grouped-asset-activity-list"
          itemLayout="horizontal"
          dataSource={paginatedLists}
          header={
            withTitle ? (
              <div className={styles.listHeader}>
                <Text className={styles.listTitle}>{withTitle.title}</Text>
                {withTitle.clickLabel && (
                  <Button className={styles.viewAll} onClick={withTitle?.onClick} type="link">
                    {withTitle.clickLabel}
                  </Button>
                )}
              </div>
            ) : undefined
          }
          renderItem={(props: AssetActivityListProps) => (
            <List.Item data-testid="grouped-asset-activity-list-item" className={styles.listItem}>
              <AssetActivityList {...props} isDrawerView={isDrawerView} />
            </List.Item>
          )}
        />
      ) : (
        <Skeleton active avatar />
      )}
    </InfiniteScroll>
  );
};
