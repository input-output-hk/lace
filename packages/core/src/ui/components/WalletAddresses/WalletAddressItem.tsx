import React from 'react';
import cn from 'classnames';
import { Typography, Tooltip } from 'antd';
import { Ellipsis } from '@lace/common';
import { ReactComponent as MissingIcon } from '../../assets/icons/missing.component.svg';
import styles from './WalletAddressItem.module.scss';
import { useTranslate } from '@src/ui/hooks';
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
  shouldUseEllipsisBeforeAndAfter?: boolean;
  isAddressWarningVisible?: boolean;
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
  shouldUseEllipsisBeforeAndAfter,
  isAddressWarningVisible = false
}: WalletAddressItemProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <div
      onClick={() => onClick({ id, name, address })}
      data-testid="address-list-item"
      className={cn(styles.listItemContainer, { [styles.small]: isSmall, className })}
    >
      <div>
        <div className={cn(styles.listItemBlock, { [styles.small]: isSmall })}>
          <div
            data-testid="address-list-item-avatar"
            className={cn(styles.listItemAvatar, { [styles.small]: isSmall })}
          >
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
        {isAddressWarningVisible && (
          <Tooltip title={t('package.core.addressBook.addressHandleTooltip')}>
            <MissingIcon data-testid="address-list-item-warning" className={cn(styles.listItemWarning)} />
          </Tooltip>
        )}
        <Ellipsis
          dataTestId="address-list-item-address"
          text={address}
          textClassName={cn(styles.addressColor, styles.textField)}
          className={cn(styles.listItemBlock, styles.listItemAddress)}
          withTooltip={false}
          {...(isSmall || shouldUseEllipsisBeforeAndAfter
            ? {
                beforeEllipsis,
                afterEllipsis
              }
            : { ellipsisInTheMiddle: true })}
        />
      </div>
    </div>
  );
};
