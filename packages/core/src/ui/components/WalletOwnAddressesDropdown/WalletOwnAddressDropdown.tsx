import React, { useState } from 'react';
import { Dropdown, Menu } from 'antd';
import styles from './WalletOwnAddressDropdown.module.scss';
import { addEllipsis, Button } from '@lace/common';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

export interface ItemSchema {
  id: number;
  address: string;
}

export type WalletOwnAddressDropdownProps = {
  className?: string;
  items: ItemSchema[];
};

const FIRST_PART_ADDRESS_LENGHT = 29;
const LAST_PART_ADDRESS_LENGHT = 14;

export const WalletOwnAddressDropdown = ({ className, items }: WalletOwnAddressDropdownProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(t('core.VotingProcedures.voterType'));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setIsDropdownMenuOpen(open);
  };

  const menu = (
    <Menu className={styles.menu}>
      {items.length > 0 ? (
        items.map((item, index) => (
          <Menu.Item
            key={index}
            onClick={() => {
              setSelectedAddress(addEllipsis(item?.address, FIRST_PART_ADDRESS_LENGHT, LAST_PART_ADDRESS_LENGHT));
              handleOpenChange(false);
            }}
          >
            <div>{item?.address}</div>
          </Menu.Item>
        ))
      ) : (
        <Menu.Item>{'No items available'}</Menu.Item>
      )}
    </Menu>
  );

  return (
    <div className={cn(styles.wrapper, className)}>
      <Dropdown
        overlay={menu}
        trigger={['click']}
        onVisibleChange={handleOpenChange}
        visible={isOpen}
        overlayClassName={styles.dropdownOverlay}
      >
        <Button
          variant="outlined"
          color="secondary"
          className={cn(styles.avatarBtn, { [styles.open]: isDropdownMenuOpen })}
          data-testid="header-menu-button"
        >
          <span className={styles.content}>{selectedAddress}</span>
        </Button>
      </Dropdown>
    </div>
  );
};
