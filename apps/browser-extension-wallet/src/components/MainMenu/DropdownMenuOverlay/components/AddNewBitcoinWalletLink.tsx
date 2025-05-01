import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';

interface Props {
  isPopup?: boolean;
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}

export const AddNewBitcoinWalletLink = ({ isPopup }: Props): React.ReactElement => {
  const { t } = useTranslation();
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
      <Menu.Item data-testid="header-menu-add-bitcoin-wallet" className={styles.menuItem}>
        {t('browserView.sideMenu.links.addBitcoinWallet')}
      </Menu.Item>
    </Link>
  );
};
