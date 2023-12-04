import React from 'react';
import { walletRoutePaths } from '@routes';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from '../DropdownMenuOverlay.module.scss';

const handleOnClicked = (): void => void 0;

export const AddNewWalletLink = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Link to={walletRoutePaths.newWallet.home} onClick={handleOnClicked}>
      <Menu.Item data-testid="header-menu-new-wallet" className={styles.menuItem}>
        <a>{t('browserView.sideMenu.links.addNewWallet')}</a>
      </Menu.Item>
    </Link>
  );
};
