import { List, Skeleton, Typography, Button } from 'antd';
import cn from 'classnames';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { AssetActivityList, AssetActivityListProps } from './AssetActivityList';
import styles from './AssetActivityList.module.scss';
import isNumber from 'lodash/isNumber';
import * as UIToolkit from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const ESTIMATED_MIN_GROUP_HEIGHT = 100;

export const useItemsPageSize = (estimatedItemHeight = ESTIMATED_MIN_GROUP_HEIGHT): number => {
  // workaround for bug in react-infinite-scroll-component
  // related to not loading more elements if the height of the container is less than the height of the window
  // see: https://github.com/ankeetmaini/react-infinite-scroll-component/issues/380
  // ticket for proper fix on our end: https://input-output.atlassian.net/browse/LW-8986
  // initialWindowHeight state needed to ensure that page size remains the same if window is resized
  const [initialWindowHeight] = useState(window.innerHeight);
  // eslint-disable-next-line no-magic-numbers
  return Math.max(5, Math.floor(initialWindowHeight / estimatedItemHeight));
};

export interface GroupedAssetActivityListProps {
  lists: AssetActivityListProps[];
  scrollableTarget: string;
  endMessage?: React.ReactNode;
  dataLength: number;
  withTitle?: {
    title: string;
    onClick?: () => void;
    clickLabel?: string;
  };
  isDrawerView?: boolean;
  loadMore: () => void;
  hasMore: boolean;
  loadFirstChunk?: boolean;
  loadingError?: Error | null;
  retryLoading?: () => void;
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
  loadFirstChunk,
  loadingError,
  retryLoading
}: GroupedAssetActivityListProps): React.ReactElement => {
  const { t } = useTranslation();
  const next = useCallback(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (loadFirstChunk) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loader = useMemo(
    () =>
      loadingError ? (
        <UIToolkit.Flex mb="$32" gap="$8" flexDirection="column" alignItems="center" testId="next-page-loading-error">
          <UIToolkit.Text.Body.Large>{t('core.activity.loaderError.message')}</UIToolkit.Text.Body.Large>
          <UIToolkit.Button.CallToAction label={t('core.activity.loaderError.buttonLabel')} onClick={retryLoading} />
        </UIToolkit.Flex>
      ) : (
        <div data-testid="infinite-scroll-skeleton">
          <Skeleton active avatar />
        </div>
      ),
    [loadingError, retryLoading, t]
  );

  return (
    <InfiniteScroll
      dataLength={dataLength}
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
