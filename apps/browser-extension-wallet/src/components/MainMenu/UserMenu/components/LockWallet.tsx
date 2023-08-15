import React from 'react';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../../UserMenu/components/UserMenu.module.scss';

export const LockWallet = (): React.ReactElement => {
  const { t } = useTranslation();
  const { lockWallet } = useWalletManager();
  const { walletLock } = useWalletStore();

  return (
    <Menu.Item data-testid="header-menu-lock" onClick={lockWallet} className={styles.menuItem} disabled={!walletLock}>
      {t('browserView.topNavigationBar.links.lockWallet')}
    </Menu.Item>
  );
};
