import React, { useState } from 'react';
import { Dropdown, Menu } from 'antd';
import { ItemSchema } from './WalletUsedAddressItem';
import styles from './WalletUsedAddressDropdown.module.scss';
import { Button } from '@lace/common';
import cn from 'classnames';

export type WalletUsedAddressDropdownProps = {
  className?: string;
  items: ItemSchema[];
};

export const WalletUsedAddressDropdown = ({ className, items }: WalletUsedAddressDropdownProps): React.ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setIsDropdownMenuOpen(open);
  };

  const menu = (
    <Menu className={styles.menu}>
      {items.length > 0 ? (
        items.map((item, index) => (
          <Menu.Item key={index}>
            <div> {JSON.stringify(item)} </div>
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
          <span className={styles.content}>Select Address</span>
        </Button>
      </Dropdown>
    </div>
  );
};
