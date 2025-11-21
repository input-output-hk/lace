import React, { useEffect } from 'react';
import cn from 'classnames';
import { List, ListProps, Skeleton } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import isNumber from 'lodash/isNumber';
import { WalletAddressItem, WalletAddressItemProps } from './WalletAddressItem';
import styles from './WalletAddressList.module.scss';
import { TranslationsFor } from '@ui/utils/types';

export type WalletAddressListProps = {
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: WalletAddressItemProps[];
  loadMoreData: () => void;
  total: number;
  scrollableTargetId?: string;
  withHeader?: boolean;
  popupView?: boolean;
  translations: TranslationsFor<'name' | 'address'>;
} & ListProps<WalletAddressItemProps>;

const SCROLLABLE_CONTAINER_ID = 'containerID';

export const WalletAddressList = ({
  className,
  emptyText,
  total,
  loadMoreData,
  items,
  scrollableTargetId = SCROLLABLE_CONTAINER_ID,
  withHeader = true,
  popupView,
  translations,
  ...props
}: WalletAddressListProps): React.ReactElement => {
  const hasMore = items && items.length < total;

  useEffect(() => {
    const root = document.querySelector(`#${SCROLLABLE_CONTAINER_ID}`);
    if (hasMore && root && root.scrollHeight <= root.clientHeight) {
      loadMoreData();
    }
  }, [hasMore, scrollableTargetId, loadMoreData]);

  return (
    <div id={SCROLLABLE_CONTAINER_ID} className={styles.wrapper}>
      {withHeader && (
        <div data-testid="address-list-header" className={styles.header}>
          <div className={styles.nameHeader}>{translations.name}</div>
          <div>{translations.address}</div>
        </div>
      )}
      {items && (
        <InfiniteScroll
          dataLength={items.length}
          next={loadMoreData}
          hasMore={hasMore}
          loader={<Skeleton active avatar />}
          scrollableTarget={scrollableTargetId}
          style={{ overflow: 'hidden' }}
        >
          {!isNumber(total) ? (
            <Skeleton className={cn(styles.skeleton, { [styles.popupView]: popupView })} active avatar />
          ) : (
            <List
              className={className}
              data-testid="address-list"
              dataSource={items}
              itemLayout="horizontal"
              locale={{ emptyText }}
              renderItem={(walletItem: WalletAddressItemProps) => (
                <List.Item className={styles.listItemWrapper}>
                  <WalletAddressItem {...walletItem} />
                </List.Item>
              )}
              {...props}
            />
          )}
        </InfiniteScroll>
      )}
    </div>
  );
};
