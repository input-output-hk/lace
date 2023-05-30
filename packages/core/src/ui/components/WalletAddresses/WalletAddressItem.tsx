import React from 'react';
import cn from 'classnames';
import { Typography } from 'antd';
import { Ellipsis } from '@lace/common';
import styles from './WalletAddressItem.module.scss';
const { Text } = Typography;

interface AddressBookSchema {
  id: number;
  name: string;
  address: string;
}

export type WalletAddressItemProps = {
  id: number;
  name: string;
  address: string;
  onClick?: (address: AddressBookSchema) => void;
  className?: string;
  beforeEllipsis?: number;
  afterEllipsis?: number;
  isSmall?: boolean;
  shouldUseEllipsisBeferoAfter?: boolean;
};

const defaultBeforeEllipsis = 8;
const defaultAfterEllipsis = 3;

export const WalletAddressItem = ({
  id,
  name,
  address,
  onClick,
  beforeEllipsis = defaultBeforeEllipsis,
  afterEllipsis = defaultAfterEllipsis,
  className,
  isSmall = false,
  shouldUseEllipsisBeferoAfter
}: WalletAddressItemProps): React.ReactElement => (
  <div
    onClick={() => onClick({ id, name, address })}
    data-testid="address-list-item"
    className={cn(styles.listItemContainer, { [styles.small]: isSmall, className })}
  >
    <div>
      <div className={cn(styles.listItemBlock, { [styles.small]: isSmall })}>
        <div data-testid="address-list-item-avatar" className={cn(styles.listItemAvatar, { [styles.small]: isSmall })}>
          {name.charAt(0).toLocaleUpperCase()}
        </div>
        <div data-testid="address-list-item-name" className={cn(styles.listItemName, { [styles.small]: isSmall })}>
          <Text className={styles.textField} ellipsis={{ tooltip: name }}>
            {name}
          </Text>
        </div>
      </div>
    </div>
    <div className={cn(styles.listItemBlock, styles.addressBox)}>
      <Ellipsis
        dataTestId="address-list-item-address"
        text={address}
        textClassName={cn(styles.addressColor, styles.textField)}
        className={cn(styles.listItemBlock, styles.listItemAddress)}
        withTooltip={false}
        {...(isSmall || shouldUseEllipsisBeferoAfter
          ? {
              beforeEllipsis,
              afterEllipsis
            }
          : { ellipsisInTheMiddle: true })}
      />
    </div>
  </div>
);
