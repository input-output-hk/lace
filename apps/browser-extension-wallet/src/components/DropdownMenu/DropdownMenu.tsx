import React, { useEffect } from 'react';
import cn from 'classnames';
import { Dropdown } from 'antd';
import { Button, addEllipsis } from '@lace/common';
import { DropdownMenuOverlay } from '../MainMenu';
import ChevronNormal from '../../assets/icons/chevron-down.component.svg';
import ChevronSmall from '../../assets/icons/chevron-down-small.component.svg';
import styles from './DropdownMenu.module.scss';
import { useWalletStore } from '@src/stores';
import { UserAvatar } from '../MainMenu/DropdownMenuOverlay/components';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { ProfileDropdown } from '@lace/ui';
import { useWalletAvatar } from '@hooks';
import { getActiveWalletSubtitle } from '@src/utils/get-wallet-subtitle';
import { getUiWalletType } from '@src/utils/get-ui-wallet-type';

export interface DropdownMenuProps {
  isPopup?: boolean;
}

export const DropdownMenu = ({ isPopup }: DropdownMenuProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const {
    cardanoWallet,
    walletUI: { isDropdownMenuOpen = false },
    setIsDropdownMenuOpen
  } = useWalletStore();

  const Chevron = isPopup ? ChevronSmall : ChevronNormal;
  const { activeWalletAvatar } = useWalletAvatar();

  const sendAnalyticsEvent = (event: PostHogAction) => {
    analytics.sendEventToPostHog(event);
  };

  const handleDropdownState = (openDropdown: boolean) => {
    setIsDropdownMenuOpen(openDropdown);
    if (openDropdown) {
      sendAnalyticsEvent(PostHogAction.UserWalletProfileIconClick);
    }
  };

  useEffect(() => () => setIsDropdownMenuOpen(false), [setIsDropdownMenuOpen]);

  const walletName = cardanoWallet.source.wallet.metadata.name;

  const titleCharBeforeEll = 10;
  const titleCharAfterEll = 0;

  return (
    <Dropdown
      overlayClassName={styles.overlay}
      destroyPopupOnHide
      onOpenChange={handleDropdownState}
      overlay={<DropdownMenuOverlay isPopup={isPopup} sendAnalyticsEvent={sendAnalyticsEvent} />}
      placement="bottomRight"
      trigger={['click']}
    >
      {process.env.USE_MULTI_WALLET === 'true' ? (
        <div className={styles.profileDropdownTrigger}>
          <ProfileDropdown.Trigger
            title={addEllipsis(walletName, titleCharBeforeEll, titleCharAfterEll)}
            subtitle={getActiveWalletSubtitle(cardanoWallet.source.account)}
            active={isDropdownMenuOpen}
            profile={
              activeWalletAvatar
                ? {
                    fallbackText: walletName,
                    imageSrc: activeWalletAvatar
                  }
                : undefined
            }
            type={getUiWalletType(cardanoWallet.source.wallet.type)}
            id="menu"
          />
        </div>
      ) : (
        <Button
          variant="outlined"
          color="secondary"
          className={cn(styles.avatarBtn, { [styles.open]: isDropdownMenuOpen })}
          data-testid="header-menu-button"
        >
          <span className={cn(styles.content, { [styles.isPopup]: isPopup })}>
            <UserAvatar walletName={walletName} isPopup={isPopup} avatar={activeWalletAvatar} />
            <Chevron
              className={cn(styles.chevron, { [styles.open]: isDropdownMenuOpen })}
              data-testid={`chevron-${isDropdownMenuOpen ? 'up' : 'down'}`}
            />
          </span>
        </Button>
      )}
    </Dropdown>
  );
};
