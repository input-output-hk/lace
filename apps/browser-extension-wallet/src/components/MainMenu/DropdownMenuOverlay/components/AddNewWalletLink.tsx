import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';
// import { useAnalyticsContext } from '@providers';
// import {
//   MatomoEventActions,
//   MatomoEventCategories,
//   AnalyticsEventNames,
//   PostHogAction
// } from '@providers/AnalyticsProvider/analyticsTracker';

const handleOnClicked = () => {
  // analytics.sendEventToMatomo({
  //   category: MatomoEventCategories.ADDRESS_BOOK,
  //   action: MatomoEventActions.CLICK_EVENT,
  //   name: isPopup
  //     ? AnalyticsEventNames.AddressBook.VIEW_ADDRESSES_POPUP
  //     : AnalyticsEventNames.AddressBook.VIEW_ADDRESSES_BROWSER
  // });
  // analytics.sendEventToPostHog(PostHogAction.UserWalletProfileAddressBookClick);
};

export const AddNewWalletLink = (): React.ReactElement => {
  const { t } = useTranslation();
  // const analytics = useAnalyticsContext();

  return (
    <Link to={walletRoutePaths.newWallet.home} onClick={handleOnClicked}>
      <Menu.Item data-testid="header-menu-new-wallet" className={styles.menuItem}>
        <a>{t('browserView.sideMenu.links.addNewWallet')}</a>
      </Menu.Item>
    </Link>
  );
};
