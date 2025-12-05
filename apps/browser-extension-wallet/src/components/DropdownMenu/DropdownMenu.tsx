/* eslint-disable promise/catch-or-return */
import React, { useEffect } from 'react';
import { Wallet } from '@lace/cardano';
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
import { useWalletAvatar } from '@hooks';
import { getUiWalletType } from '@src/utils/get-ui-wallet-type';
import i18n from 'i18next';
import { WalletType } from '@cardano-sdk/web-extension';
import { useCurrentBlockchain, Blockchain } from '@src/multichain';

export interface DropdownMenuProps {
  isPopup?: boolean;
}

export const getActiveWalletSubtitle = (metadata?: Wallet.AccountMetadata): string =>
  metadata ? metadata.name : i18n.t('sharedWallets.userInfo.label');

const titleCharBeforeEll = 10;
const addEllipsis = (text: string, length: number) => (text.length > length ? `${text.slice(0, length)}...` : text);

export const DropdownMenu = ({ isPopup }: DropdownMenuProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { blockchain } = useCurrentBlockchain();
  const {
    walletUI: { isDropdownMenuOpen = false },
    setIsDropdownMenuOpen,
    walletDisplayInfo
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

  const walletType = getUiWalletType(walletDisplayInfo?.walletType);

  const isBitcoinWallet = walletDisplayInfo?.walletType !== WalletType.Script && blockchain === Blockchain.Bitcoin;
  const customBitcoinProfile = isBitcoinWallet
    ? {
        customProfileComponent: (
          <span className={styles.walletOptionBitcoin}>
            <ProfileDropdown.WalletIcon type={walletType} testId={'wallet-option-icon'} />
          </span>
        )
      }
    : undefined;

  return (
    <Dropdown
      overlayClassName={styles.overlay}
      onOpenChange={handleDropdownState}
      overlay={
        <DropdownMenuOverlay open={isDropdownMenuOpen} isPopup={isPopup} sendAnalyticsEvent={sendAnalyticsEvent} />
      }
      placement="bottomRight"
      trigger={['click']}
    >
      {process.env.USE_MULTI_WALLET === 'true' && walletDisplayInfo?.walletName ? (
        <div className={styles.profileDropdownTrigger}>
          <ProfileDropdown.Trigger
            style={{ textAlign: 'left' }}
            title={addEllipsis(walletDisplayInfo?.walletName, titleCharBeforeEll)}
            subtitle={addEllipsis(getActiveWalletSubtitle(walletDisplayInfo?.walletAccount), titleCharBeforeEll)}
            active={isDropdownMenuOpen}
            profile={
              activeWalletAvatar
                ? {
                    fallbackText: walletDisplayInfo?.walletName,
                    imageSrc: activeWalletAvatar
                  }
                : customBitcoinProfile
            }
            type={walletType}
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
            <UserAvatar walletName={walletDisplayInfo?.walletName} isPopup={isPopup} avatar={activeWalletAvatar} />
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
