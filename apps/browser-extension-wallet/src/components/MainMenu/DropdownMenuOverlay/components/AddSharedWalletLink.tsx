import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';

export const AddSharedWalletLink = ({ isPopup }: { isPopup: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  const location = useLocation();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { setBackgroundPage } = useBackgroundPage();

  const openNewWallet = () => {
    if (isPopup) {
      backgroundServices.handleOpenBrowser({ section: BrowserViewSections.SHARED_WALLET });
    } else {
      setBackgroundPage(location);
    }
  };

  return (
    <Link
      to={{
        pathname: walletRoutePaths.sharedWallet.root
      }}
      onClick={openNewWallet}
    >
      <Menu.Item data-testid="header-menu-shared-wallet" className={styles.menuItem}>
        {t('browserView.sideMenu.links.addSharedWallet')}
      </Menu.Item>
    </Link>
  );
};
