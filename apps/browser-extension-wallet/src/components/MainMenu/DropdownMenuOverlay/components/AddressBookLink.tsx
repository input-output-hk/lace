import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';
import { useAnalyticsContext } from '@providers';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';

export const AddressBookLink = ({ isPopup }: { isPopup: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const handleOnClicked = () => {
    analytics.sendEventToMatomo({
      category: MatomoEventCategories.ADDRESS_BOOK,
      action: MatomoEventActions.CLICK_EVENT,
      name: isPopup
        ? AnalyticsEventNames.AddressBook.VIEW_ADDRESSES_POPUP
        : AnalyticsEventNames.AddressBook.VIEW_ADDRESSES_BROWSER
    });
    analytics.sendEventToPostHog(PostHogAction.UserWalletProfileAddressBookClick);
  };

  return (
    <Link to={walletRoutePaths.addressBook} onClick={handleOnClicked}>
      <Menu.Item data-testid="header-menu-address-book" className={styles.menuItem}>
        <a>{t('browserView.sideMenu.links.addressBook')}</a>
      </Menu.Item>
    </Link>
  );
};
