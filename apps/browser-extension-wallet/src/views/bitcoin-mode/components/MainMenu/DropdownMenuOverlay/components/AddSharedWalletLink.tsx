import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrowserViewSections } from '@lib/scripts/types';
import { useBackgroundServiceAPIContext } from '@providers';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { walletRoutePaths } from '@routes';
import styles from '../DropdownMenuOverlay.module.scss';

export const AddSharedWalletLink = ({ isPopup }: { isPopup: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  const location = useLocation();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { setBackgroundPage } = useBackgroundPage();

  const openAddSharedWallet = () => {
    if (isPopup) {
      backgroundServices.handleOpenBrowser({ section: BrowserViewSections.ADD_SHARED_WALLET });
    } else {
      setBackgroundPage(location);
    }
  };

  return (
    <Link
      to={{
        pathname: walletRoutePaths.sharedWallet.root
      }}
      onClick={openAddSharedWallet}
    >
      <Menu.Item data-testid="header-menu-add-shared-wallet" className={styles.menuItem}>
        {t('browserView.sideMenu.links.addSharedWallet')}
      </Menu.Item>
    </Link>
  );
};
