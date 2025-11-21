import { List, Button } from 'antd';
import React from 'react';
import { AssetActivityItem, AssetActivityItemProps } from './AssetActivityItem';

import styles from './AssetActivityList.module.scss';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <List
      header={
        <div className={styles.header}>
          {!isDrawerView && (
            <p data-testid="transaction-date" className={styles.title}>
              {title ?? t('core.assetActivityList.title')}
            </p>
          )}
          {onExpand && (
            <Button data-testid="expand-button" onClick={onExpand} type="text">
              {t('core.assetActivityList.viewAll')}
            </Button>
          )}
        </div>
      }
      style={{ width: '100%', padding: 0 }}
      data-testid="asset-activity-list"
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
