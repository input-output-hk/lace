import React from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { useWalletStore } from '@src/stores';
import styles from '../../UserMenu/components/UserMenu.module.scss';

type NetworkSwitcherProps = {
  onClick: () => void;
};

export const NetworkSwitcher = ({ onClick }: NetworkSwitcherProps): React.ReactElement => {
  const { t } = useTranslation();
  const { environmentName } = useWalletStore();

  return (
    <div
      data-testid="header-menu-network-switcher-container"
      className={cn(styles.menuItem, styles.cta)}
      onClick={onClick}
    >
      <div className={styles.networkSwitcher}>
        <span data-testid="header-menu-network-switcher-label">{t('browserView.topNavigationBar.links.network')}</span>
        <span data-testid="header-menu-network-switcher-value" className={styles.value}>
          {environmentName}
        </span>
      </div>
    </div>
  );
};
