import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from '../../UserMenu/components/UserMenu.module.scss';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';

export const SettingsLink = (): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const handleOnLinkClick = () => {
    analytics.sendEventToPostHog(PostHogAction.UserWalletProfileSettingsClick);
  };

  return (
    <Menu.Item className={styles.menuItem} data-testid="header-menu-settings">
      <Link to={walletRoutePaths.settings} onClick={handleOnLinkClick}>
        {t('browserView.topNavigationBar.links.settings')}
      </Link>
    </Menu.Item>
  );
};
