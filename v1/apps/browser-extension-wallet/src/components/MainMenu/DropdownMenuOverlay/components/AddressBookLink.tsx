import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export const AddressBookLink = (): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const handleOnClicked = () => {
    analytics.sendEventToPostHog(PostHogAction.UserWalletProfileAddressBookClick);
  };

  return (
    <Link to={walletRoutePaths.addressBook} onClick={handleOnClicked}>
      <Menu.Item data-testid="header-menu-address-book" className={styles.menuItem}>
        {t('browserView.sideMenu.links.addressBook')}
      </Menu.Item>
    </Link>
  );
};
