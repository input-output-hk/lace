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
import { ProfileDropdown } from '@lace/ui';
import { useGetHandles } from '@hooks';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';

export interface DropdownMenuProps {
  isPopup?: boolean;
}

export const DropdownMenu = ({ isPopup }: DropdownMenuProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { walletInfo } = useWalletStore();
  const [open, setOpen] = useState(false);
  const [handle] = useGetHandles();
  const handleImage = handle?.profilePic;
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
      onOpenChange={handleDropdownState}
      overlay={<DropdownMenuOverlay isPopup={isPopup} sendAnalyticsEvent={sendAnalyticsEvent} />}
      placement="bottomRight"
      trigger={['click']}
    >
      {process.env.USE_MULTI_WALLET === 'true' ? (
        <div className={styles.profileDropdownTrigger}>
          <ProfileDropdown.Trigger
            title={walletInfo.name}
            subtitle="Account #0"
            profile={
              handleImage
                ? {
                    fallback: walletInfo.name,
                    imageSrc: getAssetImageUrl(handleImage)
                  }
                : undefined
            }
            type={process.env.USE_SHARED_WALLET === 'true' ? 'shared' : 'cold'}
            id="menu"
          />
        </div>
      ) : (
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
      )}
    </Dropdown>
  );
};
