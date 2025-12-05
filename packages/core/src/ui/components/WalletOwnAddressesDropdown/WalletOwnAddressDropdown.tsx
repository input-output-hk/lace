import React, { useState } from 'react';
import { Dropdown } from 'antd';
import { Button, addEllipsis } from '@lace/common';
import type { MenuProps } from 'antd';
import styles from './WalletOwnAddressDropdown.module.scss';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

export interface AddressSchema {
  id: number;
  address: string;
  type?: 'payment' | 'stake';
}

export type WalletOwnAddressDropdownProps = {
  addresses: AddressSchema[];
  onSelect: (address: string) => void;
  placeholder?: string;
};

const FIRST_PART_ADDRESS_LENGTH = 29;
const LAST_PART_ADDRESS_LENGTH = 14;

export const shortenWalletOwnAddress = (address: string): string =>
  addEllipsis(address, FIRST_PART_ADDRESS_LENGTH, LAST_PART_ADDRESS_LENGTH);

export const WalletOwnAddressDropdown = ({
  addresses,
  onSelect,
  placeholder
}: WalletOwnAddressDropdownProps): React.ReactElement => {
  const { t } = useTranslation();
  const [selectedAddress, setSelectedAddress] = useState<string>(placeholder || t('core.signMessage.selectAddress'));

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const selectedItem = addresses.find((address) => address.id.toString() === e.key);
    if (selectedItem) {
      const shortenedAddress = shortenWalletOwnAddress(selectedItem.address);
      setSelectedAddress(shortenedAddress);
      onSelect(selectedItem.address);
    }
  };

  const getAddressTypeDisplay = (addressType?: 'payment' | 'stake'): string => {
    if (addressType === 'stake') {
      return ` (${t('core.signMessage.addressTypeStake')})`;
    }
    if (addressType === 'payment') {
      return ` (${t('core.signMessage.addressTypePayment')})`;
    }
    return '';
  };

  const items: MenuProps['items'] = addresses.map((address) => {
    const shortenedAddress = addEllipsis(address.address, FIRST_PART_ADDRESS_LENGTH, LAST_PART_ADDRESS_LENGTH);
    const addressType = getAddressTypeDisplay(address.type);

    return {
      key: address.id.toString(),
      label: `${shortenedAddress}${addressType}`
    };
  });

  const menuProps: MenuProps = {
    items,
    onClick: handleMenuClick
  };

  return (
    <Dropdown
      menu={menuProps}
      dropdownRender={(menus) => (
        <div data-testid="address-dropdown-menu" className={styles.addressDropdownMenu}>
          {menus}
        </div>
      )}
      trigger={['click']}
      data-testid="address-menu"
    >
      <Button
        variant="outlined"
        color="secondary"
        className={cn(styles.dropdownBtn)}
        data-testid="select-address-button"
      >
        <span className={styles.content}>{selectedAddress}</span>
      </Button>
    </Dropdown>
  );
};
