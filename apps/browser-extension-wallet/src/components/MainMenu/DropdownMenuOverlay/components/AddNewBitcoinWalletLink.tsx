import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { PostHogAction } from '@lace/common';

interface Props {
  isPopup?: boolean;
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}

export const AddNewBitcoinWalletLink = ({ isPopup }: Props): React.ReactElement => {
  const location = useLocation();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { setBackgroundPage } = useBackgroundPage();

  const openNewWallet = () => {
    if (isPopup) {
      backgroundServices.handleOpenBrowser({ section: BrowserViewSections.NEW_BITCOIN_WALLET });
    } else {
      setBackgroundPage(location);
    }
  };

  return (
    <Link
      to={{
        pathname: walletRoutePaths.newBitcoinWallet.root
      }}
      onClick={openNewWallet}
    >
      <Menu.Item data-testid="header-menu-new-wallet" className={styles.menuItem}>
        <a>Add Bitcoin wallet</a>
      </Menu.Item>
    </Link>
  );
};
