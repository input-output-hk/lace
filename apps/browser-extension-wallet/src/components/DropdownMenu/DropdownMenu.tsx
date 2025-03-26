/* eslint-disable promise/catch-or-return */
import React, { useEffect, useState } from 'react';
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
import { ProfileDropdown } from '@input-output-hk/lace-ui-toolkit';
import { useWalletAvatar, useWalletManager } from '@hooks';
import { getActiveWalletSubtitle } from '@src/utils/get-wallet-subtitle';
import { getUiWalletType } from '@src/utils/get-ui-wallet-type';
import { Bip32WalletAccount, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

export interface DropdownMenuProps {
  isPopup?: boolean;
}

const titleCharBeforeEll = 10;
const addEllipsis = (text: string, length: number) => (text.length > length ? `${text.slice(0, length)}...` : text);

export const DropdownMenu = ({ isPopup }: DropdownMenuProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const {
    walletUI: { isDropdownMenuOpen = false },
    setIsDropdownMenuOpen
  } = useWalletStore();
  const { getActiveWalletName, getActiveWalletAccount, getActiveWalletType } = useWalletManager();
  const [fullWalletName, setFullWalletName] = useState<string>('');
  const [lastActiveAccount, setLastActiveAccount] = useState<Bip32WalletAccount<Wallet.AccountMetadata> | undefined>();
  const [activeWalletType, setActiveWalletType] = useState<WalletType>(WalletType.InMemory);

  useEffect(() => {
    getActiveWalletName().then((name) => {
      setFullWalletName(name);
    });
  }, [getActiveWalletName]);

  useEffect(() => {
    getActiveWalletAccount().then((account) => {
      setLastActiveAccount(account);
    });
  }, [getActiveWalletAccount]);

  useEffect(() => {
    getActiveWalletType().then((type) => {
      setActiveWalletType(type);
    });
  }, [getActiveWalletType]);

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

  return (
    <Dropdown
      overlayClassName={styles.overlay}
      destroyPopupOnHide
      onOpenChange={handleDropdownState}
      overlay={<DropdownMenuOverlay isPopup={isPopup} sendAnalyticsEvent={sendAnalyticsEvent} />}
      placement="bottomRight"
      trigger={['click']}
    >
      {process.env.USE_MULTI_WALLET === 'true' && fullWalletName ? (
        <div className={styles.profileDropdownTrigger}>
          <ProfileDropdown.Trigger
            style={{ textAlign: 'left' }}
            title={addEllipsis(fullWalletName, titleCharBeforeEll)}
            subtitle={addEllipsis(getActiveWalletSubtitle(lastActiveAccount), titleCharBeforeEll)}
            active={isDropdownMenuOpen}
            profile={
              activeWalletAvatar
                ? {
                    fallbackText: fullWalletName,
                    imageSrc: activeWalletAvatar
                  }
                : undefined
            }
            type={getUiWalletType(activeWalletType)}
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
            <UserAvatar walletName={fullWalletName} isPopup={isPopup} avatar={activeWalletAvatar} />
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
