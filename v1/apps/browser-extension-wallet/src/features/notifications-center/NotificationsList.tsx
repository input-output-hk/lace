/* eslint-disable unicorn/no-null */
import { List, Skeleton } from 'antd';
import cn from 'classnames';
import React, { useState, useCallback, useMemo } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { NotificationListItem } from './NotificationListItem';
import styles from './NotificationsList.module.scss';
import isNumber from 'lodash/isNumber';
import Loader from '../../assets/icons/loader.component.svg';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { LaceNotificationWithTopicName } from '@src/types/notifications-center';

const ESTIMATED_MIN_ITEM_HEIGHT = 96;

export const useItemsPageSize = (estimatedItemHeight = ESTIMATED_MIN_ITEM_HEIGHT): number => {
  // workaround for bug in react-infinite-scroll-component
  // related to not loading more elements if the height of the container is less than the height of the window
  // see: https://github.com/ankeetmaini/react-infinite-scroll-component/issues/380
  // ticket for proper fix on our end: https://input-output.atlassian.net/browse/LW-8986
  // initialWindowHeight state needed to ensure that page size remains the same if window is resized
  const [initialWindowHeight] = useState(window.innerHeight);
  // eslint-disable-next-line no-magic-numbers
  return Math.max(5, Math.floor(initialWindowHeight / estimatedItemHeight));
};

export interface NotificationsListProps {
  className?: string;
  notifications: LaceNotificationWithTopicName[];
  scrollableTarget: string;
  endMessage?: React.ReactNode;
  dataLength: number;
  popupView?: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  onClick?: (id: string) => void;
  onRemove?: (id: string) => void;
  isLoading?: boolean;
  withBorder?: boolean;
  withDivider?: boolean;
}

export const NotificationsList = ({
  className,
  notifications,
  scrollableTarget,
  endMessage,
  dataLength,
  popupView,
  loadMore,
  onClick,
  hasMore = false,
  onRemove,
  isLoading = false,
  withBorder = true,
  withDivider
}: NotificationsListProps): React.ReactElement => {
  const next = useCallback(() => {
    loadMore?.();
  }, [loadMore]);

  const loader = useMemo(
    () =>
      isLoading ? (
        <Flex data-testid="infinite-scroll-skeleton" pb="$16" justifyContent="center" alignItems="center" w="$fill">
          <Loader className={styles.loader} />
        </Flex>
      ) : null,
    [isLoading]
  );

  return (
    <InfiniteScroll
      dataLength={dataLength}
      endMessage={endMessage}
      scrollableTarget={scrollableTarget}
      next={next}
      hasMore={hasMore}
      loader={loader}
      className={cn(styles.infitineScroll, className, { [styles.popupView]: popupView })}
    >
      {!isNumber(notifications.length) ? (
        <Skeleton active avatar />
      ) : (
        <List
          className={cn(styles.notificationsContainer, { [styles.popupView]: popupView })}
          data-testid="notifications-list"
          itemLayout="horizontal"
          dataSource={notifications}
          renderItem={(props: LaceNotificationWithTopicName) => (
            <List.Item
              data-testid="notification-list-item"
              className={cn(styles.listItem, className, { [styles.withBorder]: withDivider })}
            >
              <NotificationListItem
                onRemove={onRemove}
                popupView={popupView}
                withBorder={withBorder}
                id={props.message.id}
                title={props.message.title}
                topicName={props.topicName}
                publisher={props.publisher}
                isRead={props.read}
                onClick={() => onClick?.(props.message.id)}
              />
            </List.Item>
          )}
        />
      )}
    </InfiniteScroll>
  );
};
