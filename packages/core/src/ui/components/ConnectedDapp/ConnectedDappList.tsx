import React from 'react';
import { List, ListProps, Skeleton } from 'antd';
import isNumber from 'lodash/isNumber';
import { ConnectedDapp, connectedDappProps } from './ConnectedDapp';
import styles from './ConnectedDappList.module.scss';

export const CONTAINER_TESTID = 'dapp-list-container-id';
export const LIST_TESTID = 'dapp-list-id';

export type connectedDappListProps = {
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: connectedDappProps[];
  total: number;
  popupView?: boolean;
} & ListProps<connectedDappProps>;

export const ConnectedDappList = ({
  className,
  emptyText,
  total,
  items,
  popupView,
  ...props
}: connectedDappListProps): React.ReactElement => (
  <div className={styles.wrapper}>
    <div data-testid={CONTAINER_TESTID} id="infiniteScrollContainer" className={styles.infiniteScrollContainer}>
      {!isNumber(total) ? (
        <Skeleton active avatar />
      ) : (
        <List
          className={className}
          data-testid={LIST_TESTID}
          dataSource={items}
          itemLayout="horizontal"
          locale={{ emptyText }}
          renderItem={(dapp: connectedDappProps) => (
            <List.Item className={styles.listItemWrapper}>
              <ConnectedDapp {...dapp} popupView={popupView} />
            </List.Item>
          )}
          {...props}
        />
      )}
    </div>
  </div>
);
