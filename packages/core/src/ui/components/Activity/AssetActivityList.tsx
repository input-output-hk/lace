import { List, Button } from 'antd';
import React from 'react';
import { AssetActivityItem, AssetActivityItemProps } from './AssetActivityItem';

import styles from './AssetActivityList.module.scss';
import { useTranslate } from '@src/ui/hooks/useTranslate';

export interface AssetActivityListProps {
  /**
   * Array of activities (e.g. transactions, rewards)
   */
  items: AssetActivityItemProps[];
  title?: string;
  onExpand?: () => void;
  isDrawerView?: boolean;
  popupView?: boolean;
}

export const AssetActivityList = ({
  items,
  onExpand,
  title,
  isDrawerView
}: AssetActivityListProps): React.ReactElement => {
  const { t } = useTranslate();
  return (
    <List
      header={
        <div className={styles.header}>
          {!isDrawerView && (
            <p data-testid="transaction-date" className={styles.title}>
              {title ?? t('package.core.assetActivityList.title')}
            </p>
          )}
          {onExpand && (
            <Button data-testid="expand-button" onClick={onExpand} type="text">
              {t('package.core.assetActivityList.viewAll')}
            </Button>
          )}
        </div>
      }
      style={{ width: '100%', padding: 0 }}
      data-testid="address-list"
      itemLayout="horizontal"
      dataSource={items}
      renderItem={(itemProps: AssetActivityItemProps) => (
        <List.Item className={styles.listItemWrapper}>
          <AssetActivityItem {...itemProps} />
        </List.Item>
      )}
    />
  );
};
