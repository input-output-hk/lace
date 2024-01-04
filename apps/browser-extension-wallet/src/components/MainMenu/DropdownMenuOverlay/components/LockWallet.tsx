import React, { useMemo } from 'react';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { Wallet } from '@lace/cardano';

export const LockWallet = (): React.ReactElement => {
  const { t } = useTranslation();
  const { lockWallet } = useWalletManager();
  const { getKeyAgentType } = useWalletStore();
  const analytics = useAnalyticsContext();
  const isInMemoryWallet = useMemo(
    () => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory,
    [getKeyAgentType]
  );

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
