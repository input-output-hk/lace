import React from 'react';
import { List, ListProps } from 'antd';
import { WalletUsedAddressItem, ItemSchema } from './WalletUsedAddressItem';
import styles from './WalletUsedAddressList.module.scss';
import { TranslationsFor } from '@ui/utils/types';

export type WalletUsedAddressListProps = {
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: ItemSchema[];
  translations: TranslationsFor<'addressCopied' | 'copy'>;
} & ListProps<ItemSchema>;

export const WalletUsedAddressList = ({
  className,
  emptyText,
  items,
  translations,
  ...props
}: WalletUsedAddressListProps): React.ReactElement => (
  <div className={styles.wrapper}>
    {items && (
      <List
        className={className}
        data-testid="used-address-list"
        dataSource={items}
        itemLayout="horizontal"
        locale={{ emptyText }}
        renderItem={(walletItem: ItemSchema) => (
          <List.Item className={styles.listItemWrapper}>
            <WalletUsedAddressItem {...walletItem} translations={translations} />
          </List.Item>
        )}
        {...props}
      />
    )}
  </div>
);
