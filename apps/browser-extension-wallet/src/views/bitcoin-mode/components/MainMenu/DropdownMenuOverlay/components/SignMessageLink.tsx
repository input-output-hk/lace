import React from 'react';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { DrawerContent } from '@views/browser/components/Drawer';
import { useDrawer } from '@views/browser/stores';

export const SignMessageLink = (): React.ReactElement => {
  const { t } = useTranslation();
  const [, setDrawerConfig] = useDrawer();
  const handleOnLinkClick = () => {
    setDrawerConfig({ content: DrawerContent.SIGN_MESSAGE });
  };

  return (
    <Menu.Item data-testid="header-menu-sign-message" className={styles.menuItem} onClick={handleOnLinkClick}>
      <a>{t('browserView.topNavigationBar.links.signMessage')}</a>
    </Menu.Item>
  );
};
