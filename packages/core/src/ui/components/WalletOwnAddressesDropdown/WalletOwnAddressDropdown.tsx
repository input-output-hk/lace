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
}

export type WalletOwnAddressDropdownProps = {
  addresses: AddressSchema[];
  onSelect: (address: string) => void;
  placeholder?: string;
};

const FIRST_PART_ADDRESS_LENGTH = 29;
const LAST_PART_ADDRESS_LENGTH = 14;

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
      const shortenedAddress = addEllipsis(selectedItem.address, FIRST_PART_ADDRESS_LENGTH, LAST_PART_ADDRESS_LENGTH);
      setSelectedAddress(shortenedAddress);
      onSelect(selectedItem.address);
    }
  };

  const items: MenuProps['items'] = addresses.map((address) => ({
    key: address.id.toString(),
    label: addEllipsis(address.address, FIRST_PART_ADDRESS_LENGTH, LAST_PART_ADDRESS_LENGTH)
  }));

  const menuProps: MenuProps = {
    items,
    onClick: handleMenuClick
  };

  return (
    <Dropdown menu={menuProps} trigger={['click']}>
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
