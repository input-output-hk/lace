import { List, Skeleton, Typography, Button } from 'antd';
import cn from 'classnames';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { AssetActivityList, AssetActivityListProps } from './AssetActivityList';
import styles from './AssetActivityList.module.scss';
import isNumber from 'lodash/isNumber';

const { Text } = Typography;

export const useGroupedActivitiesPageSize = (): number => {
  // workaround for bug in react-infinite-scroll-component
  // related to not loading more elements if the height of the container is less than the height of the window
  // see: https://github.com/ankeetmaini/react-infinite-scroll-component/issues/380
  // ticket for proper fix on our end: https://input-output.atlassian.net/browse/LW-8986
  // initialWindowHeight state needed to ensure that page size remains the same if window is resized
  const [initialWindowHeight] = useState(window.innerHeight);
  const ESTIMATED_MIN_GROUP_HEIGHT = 100;
  // eslint-disable-next-line no-magic-numbers
  return Math.max(5, Math.floor(initialWindowHeight / ESTIMATED_MIN_GROUP_HEIGHT));
};

export interface GroupedAssetActivityListProps {
  lists: AssetActivityListProps[];
  scrollableTarget: string;
  endMessage?: React.ReactNode;
  dataLength?: number;
  withTitle?: {
    title: string;
    onClick?: () => void;
    clickLabel?: string;
  };
  isDrawerView?: boolean;
  loadMore: () => void;
  hasMore: boolean;
  loadFirstChunk?: boolean;
}
export const GroupedAssetActivityList = ({
  lists,
  scrollableTarget,
  endMessage,
  dataLength,
  withTitle,
  isDrawerView,
  loadMore,
  hasMore,
  loadFirstChunk
}: GroupedAssetActivityListProps): React.ReactElement => {
  const next = useCallback(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (loadFirstChunk) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loader = useMemo(
    () => (
      <div data-testid="infinite-scroll-skeleton">
        <Skeleton active avatar />
      </div>
    ),
    []
  );

  return (
    <InfiniteScroll
      dataLength={dataLength ?? 0}
      endMessage={endMessage}
      scrollableTarget={scrollableTarget}
      next={next}
      hasMore={hasMore}
      loader={loader}
      className={cn(styles.infitineScroll, { [styles.isDrawerView]: isDrawerView })}
    >
      {!isNumber(lists.length) ? (
        <Skeleton active avatar />
      ) : (
        <List
          className={cn(styles.activityContainer, { [styles.isDrawerView]: isDrawerView })}
          data-testid="grouped-asset-activity-list"
          itemLayout="horizontal"
          dataSource={lists}
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
