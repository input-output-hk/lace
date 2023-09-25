import React, { useState } from 'react';
import cn from 'classnames';
import { Dropdown } from 'antd';
import { Button } from '@lace/common';
import { DropdownMenuOverlay } from '../MainMenu';

import ChevronNormal from '../../assets/icons/chevron-down.component.svg';
import ChevronSmall from '../../assets/icons/chevron-down-small.component.svg';
import styles from './DropdownMenu.module.scss';
import { useWalletStore } from '@src/stores';
import { UserAvatar } from '../MainMenu/DropdownMenuOverlay/components';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export interface DropdownMenuProps {
  isPopup?: boolean;
}

export const DropdownMenu = ({ isPopup }: DropdownMenuProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { walletInfo } = useWalletStore();
  const [open, setOpen] = useState(false);
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
      onVisibleChange={handleDropdownState}
      overlay={<DropdownMenuOverlay isPopup={isPopup} sendAnalyticsEvent={sendAnalyticsEvent} />}
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
