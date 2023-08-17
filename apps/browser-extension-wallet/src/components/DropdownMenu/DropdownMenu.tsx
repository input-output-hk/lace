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
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

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
  const analytics = useAnalyticsContext();
  const { walletInfo } = useWalletStore();
  const [open, setOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<Sections>(Sections.Main);
  const Chevron = isPopup ? ChevronSmall : ChevronNormal;

  const sendAnalyticsEvent = (event: PostHogAction) => {
    analytics.sendEventToPostHog(event);
  };

  const handleDropdownState = (openDropdown: boolean) => {
    setOpen(openDropdown);
    if (openDropdown) {
      sendAnalyticsEvent(PostHogAction.UserWalletProfileIconClick);
    }
  };

  return (
    <Dropdown
      destroyPopupOnHide
      overlay={<DropdownMenuOverlay isPopup={isPopup} sendAnalyticsEvent={sendAnalyticsEvent} />}
      onOpenChange={handleDropdownState}
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
