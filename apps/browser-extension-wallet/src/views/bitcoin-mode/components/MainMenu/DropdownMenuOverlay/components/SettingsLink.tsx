import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';

export const SettingsLink = (): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const handleOnLinkClick = () => {
    analytics.sendEventToPostHog(PostHogAction.UserWalletProfileSettingsClick);
  };

  return (
    <Link to={walletRoutePaths.settings} onClick={handleOnLinkClick}>
      <Menu.Item data-testid="header-menu-settings" className={styles.menuItem}>
        <a>{t('browserView.topNavigationBar.links.settings')}</a>
      </Menu.Item>
    </Link>
  );
};
