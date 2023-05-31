import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';

export const SettingsLink = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Link to={walletRoutePaths.settings}>
      <Menu.Item data-testid="header-menu-settings" className={styles.menuItem}>
        <a>{t('browserView.topNavigationBar.links.settings')}</a>
      </Menu.Item>
    </Link>
  );
};
