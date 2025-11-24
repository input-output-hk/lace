import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
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

export const AddNewWalletLink = ({ isPopup, sendAnalyticsEvent }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const location = useLocation();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { setBackgroundPage } = useBackgroundPage();

  const openNewWallet = () => {
    sendAnalyticsEvent(PostHogAction.UserWalletProfileAddNewWalletClick);
    if (isPopup) {
      backgroundServices.handleOpenBrowser({ section: BrowserViewSections.NEW_WALLET });
    } else {
      setBackgroundPage(location);
    }
  };

  return (
    <Link
      to={{
        pathname: walletRoutePaths.newWallet.root
      }}
      onClick={openNewWallet}
    >
      <Menu.Item data-testid="header-menu-new-wallet" className={styles.menuItem}>
        {t('browserView.sideMenu.links.addNewWallet')}
      </Menu.Item>
    </Link>
  );
};
