import React from 'react';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { WalletType } from '@cardano-sdk/web-extension';

export const LockWallet = (): React.ReactElement => {
  const { t } = useTranslation();
  const { lockWallet } = useWalletManager();
  const { getWalletType } = useWalletStore();
  const analytics = useAnalyticsContext();
  const isInMemoryWallet = getWalletType() === WalletType.InMemory;

  const handleLockWallet = () => {
    analytics.sendEventToPostHog(PostHogAction.UserWalletProfileLockWalletClick);
    lockWallet();
  };

  return (
    <Menu.Item
      data-testid="header-menu-lock"
      onClick={handleLockWallet}
      className={styles.menuItem}
      disabled={!isInMemoryWallet}
    >
      {t('browserView.topNavigationBar.links.lockWallet')}
    </Menu.Item>
  );
};
