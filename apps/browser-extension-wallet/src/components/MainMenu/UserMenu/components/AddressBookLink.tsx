import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from '../../UserMenu/components/UserMenu.module.scss';
import { useAnalyticsContext } from '@providers';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';

export const AddressBookLink = ({ isPopup }: { isPopup: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const handleOnClicked = () => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.ADDRESS_BOOK,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: isPopup
        ? AnalyticsEventNames.AddressBook.VIEW_ADDRESSES_POPUP
        : AnalyticsEventNames.AddressBook.VIEW_ADDRESSES_BROWSER
    });
  };

  return (
    <Link to={walletRoutePaths.addressBook} onClick={handleOnClicked}>
      <Menu.Item data-testid="header-menu-address-book" className={styles.menuItem}>
        <a>{t('browserView.sideMenu.links.addressBook')}</a>
      </Menu.Item>
    </Link>
  );
};
