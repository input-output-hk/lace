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
  NetworkSwitcher,
  NetworkInfo,
  SettingsLink,
  ThemeSwitcher,
  UserAvatar,
  UserInfo
} from '../MainMenu/UserMenu/components';
import { Sections } from '@components/MainMenu/UserMenu/types';
import { ItemType, MenuItemType } from 'antd/lib/menu/hooks/useItems';
import menuStyles from '../MainMenu/UserMenu/components/UserMenu.module.scss';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';

export interface DropdownMenuProps {
  isPopup?: boolean;
  lockWalletButton?: ReactNode;
  topSection?: MenuItemType;
}

export const DropdownMenu = ({
  isPopup,
  lockWalletButton = <LockWallet />,
  topSection = <UserInfo />
}: DropdownMenuProps): React.ReactElement => {
  const { walletInfo } = useWalletStore();
  const [open, setOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<Sections>(Sections.Main);
  const analytics = useAnalyticsContext();

  const Chevron = isPopup ? ChevronSmall : ChevronNormal;

  const items: ItemType[] =
    currentSection === Sections.Main
      ? [
          { key: 'user-info', label: topSection },
          {
            key: 'links',
            className: menuStyles.links,
            type: 'group',
            children: [
              { key: 'address-book', label: <AddressBookLink isPopup={isPopup} /> },
              { key: 'settings', label: <SettingsLink /> },
              { type: 'divider', className: menuStyles.separator },
              { key: 'theme-switcher', label: <ThemeSwitcher isPopup={isPopup} /> },
              {
                key: 'network-switcher',
                label: <NetworkSwitcher onClick={() => setCurrentSection(Sections.NetworkInfo)} />
              },
              lockWalletButton && { type: 'divider', className: menuStyles.separator },
              lockWalletButton && { key: 'lock-wallet', label: lockWalletButton }
            ]
          }
        ]
      : [{ key: 'network-info', label: <NetworkInfo onBack={() => setCurrentSection(Sections.Main)} /> }];

  const handleDropdownState = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      analytics.sendEventToPostHog(PostHogAction.UserWalletProfileIconClick);
    }
  };

  return (
    <Dropdown
      destroyPopupOnHide
      onOpenChange={handleDropdownState}
      menu={{ items, rootClassName: menuStyles.menuOverlay }}
      placement="bottomRight"
      trigger={['click']}
      open={open}
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
