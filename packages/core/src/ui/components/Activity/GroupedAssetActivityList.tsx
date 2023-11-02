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
  infiniteScrollProps?: Partial<InfiniteScrollProps>;
  withTitle?: {
    title: string;
    onClick?: () => void;
    clickLabel?: string;
  };
  isDrawerView?: boolean;
}

export const GroupedAssetActivityList = ({
  lists,
  infiniteScrollProps,
  withTitle,
  isDrawerView
}: GroupedAssetActivityListProps): React.ReactElement => {
  // workaround for bug in react-infinite-scroll-component
  // related to not loading more elements if the height of the container is less than the height of the window
  // see: https://github.com/ankeetmaini/react-infinite-scroll-component/issues/380
  // ticket for proper fix on our end: https://input-output.atlassian.net/browse/LW-8986
  // initialWindowHeight state needed to ensure that page size remains the same if window is resized
  const [initialWindowHeight] = useState(window.innerHeight);
  const ESTIMATED_MIN_GROUP_HEIGHT = 100;
  // eslint-disable-next-line no-magic-numbers
  const pageSize = Math.max(5, Math.floor(initialWindowHeight / ESTIMATED_MIN_GROUP_HEIGHT));

  const FAKE_LOAD_TIMEOUT = 1000;
  const [skip, setSkip] = useState(0);
  const [paginatedLists, setPaginatedLists] = useState(take(lists, skip + pageSize));

  const loadMoreData = () => {
    setTimeout(() => {
      setSkip(skip + pageSize);
    }, FAKE_LOAD_TIMEOUT);
  };

  useEffect(() => {
    if (lists.length === 0) return;
    setPaginatedLists(take(lists, skip + pageSize));
  }, [skip, lists, pageSize]);

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
      {...infiniteScrollProps}
      className={cn(styles.infitineScroll, { [styles.isDrawerView]: isDrawerView })}
    >
      {!isNumber(lists.length) ? (
        <Skeleton active avatar />
      ) : (
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
      )}
    </InfiniteScroll>
  );
};
