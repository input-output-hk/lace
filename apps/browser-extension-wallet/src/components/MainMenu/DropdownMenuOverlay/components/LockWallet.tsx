import React from 'react';
import { useWalletManager } from '@hooks';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export const LockWallet = (): React.ReactElement => {
  const { t } = useTranslation();
  const { lockWallet } = useWalletManager();
  const analytics = useAnalyticsContext();

  const handleLockWallet = () => {
    analytics.sendEventToPostHog(PostHogAction.UserWalletProfileLockWalletClick);
    lockWallet();
  };

  return (
    <Menu.Item data-testid="header-menu-lock" onClick={handleLockWallet} className={styles.menuItem} disabled>
      {t('browserView.topNavigationBar.links.lockWallet')}
    </Menu.Item>
  );
};
