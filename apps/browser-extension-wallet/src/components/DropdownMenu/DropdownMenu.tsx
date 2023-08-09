import React, { ReactNode, useState } from 'react';
import cn from 'classnames';
import { Dropdown } from 'antd';
import { Button } from '@lace/common';

import ChevronNormal from '../../assets/icons/chevron-down.component.svg';
import ChevronSmall from '../../assets/icons/chevron-down-small.component.svg';
import styles from './DropdownMenu.module.scss';
import { useWalletStore } from '@src/stores';
import {
  AddressBookLink,
  LockWallet,
  NetworkChoise,
  NetworkInfo,
  SettingsLink,
  ThemeSwitcher,
  UserAvatar,
  UserInfo
} from '../MainMenu/DropdownMenuOverlay/components';
import { Sections } from '@components/MainMenu/DropdownMenuOverlay/types';
import { ItemType, MenuItemType } from 'antd/lib/menu/hooks/useItems';
import menuStyles from '../MainMenu/DropdownMenuOverlay/DropdownMenuOverlay.module.scss';

export interface DropdownMenuProps {
  isPopup?: boolean;
  lockWalletButton?: ReactNode;
  topSection?: MenuItemType;
}

export const DropdownMenu = ({
  isPopup,
  lockWalletButton = <LockWallet />,
  topSection = { key: 'user-info', label: <UserInfo /> }
}: DropdownMenuProps): React.ReactElement => {
  const { walletInfo } = useWalletStore();
  const [open, setOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<Sections>(Sections.Main);
  const Chevron = isPopup ? ChevronSmall : ChevronNormal;

  const items: ItemType[] =
    currentSection === Sections.Main
      ? [
          topSection,
          { key: 'address-book', label: <AddressBookLink isPopup={isPopup} /> },
          { key: 'settings', label: <SettingsLink /> },
          { type: 'divider' },
          { key: 'theme-switcher', label: <ThemeSwitcher isPopup={isPopup} /> },
          { key: 'network', label: <NetworkChoise onClick={() => setCurrentSection(Sections.NetworkInfo)} /> },
          { type: 'divider' },
          lockWalletButton && { key: 'lock-wallet', label: lockWalletButton }
        ]
      : [{ key: 'network-info', label: <NetworkInfo onBack={() => setCurrentSection(Sections.Main)} /> }];

  return (
    <Dropdown
      destroyPopupOnHide
      onOpenChange={setOpen}
      menu={{ items, className: menuStyles.menuOverlay }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button
        variant="outlined"
        color="secondary"
        className={cn(styles.avatarBtn, { [styles.open]: open })}
        data-testid="header-menu-button"
      >
        <span className={cn(styles.content, { [styles.isPopup]: isPopup })}>
          <UserAvatar walletName={walletInfo.name} isPopup={isPopup} />
          <Chevron
            className={cn(styles.chevron, { [styles.open]: open })}
            data-testid={`chevron-${open ? 'up' : 'down'}`}
          />
        </span>
      </Button>
    </Dropdown>
  );
};
