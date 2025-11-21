import React, { useCallback } from 'react';
import { Menu } from 'antd';
import styles from '../DropdownMenuOverlay.module.scss';
import { PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { useLMP } from '@hooks';

interface Props {
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const AddNewMidnightWalletLink = (_: Props): React.ReactElement => {
  const { t } = useTranslation();
  const { switchToLMP } = useLMP();
  const onClick = useCallback(() => {
    switchToLMP();
    // TODO: send analytics event
  }, [switchToLMP]);

  return (
    <Menu.Item data-testid="header-menu-add-midnight-wallet" className={styles.menuItem} onClick={onClick}>
      {t('browserView.sideMenu.links.addMidnightWallet')}
    </Menu.Item>
  );
};
