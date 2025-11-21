import { List, Typography, Button } from 'antd';
import cn from 'classnames';
import React from 'react';
import { Props as InfiniteScrollProps } from 'react-infinite-scroll-component';
import { AssetActivityList, AssetActivityListProps } from './AssetActivityList';
import styles from './AssetActivityList.module.scss';

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
  withTitle,
  isDrawerView
}: GroupedAssetActivityListProps): React.ReactElement => (
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
);
