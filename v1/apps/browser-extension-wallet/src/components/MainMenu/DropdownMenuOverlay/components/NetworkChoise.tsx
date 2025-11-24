import React from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { useWalletStore } from '@src/stores';
import styles from '../DropdownMenuOverlay.module.scss';
import { getNetworkName } from '@src/utils/get-network-name';
import { useCurrentBlockchain } from '@src/multichain';

type NetworkChoiseProps = {
  onClick: () => void;
};

export const NetworkChoise = ({ onClick }: NetworkChoiseProps): React.ReactElement => {
  const { t } = useTranslation();
  const { environmentName } = useWalletStore();
  const { blockchain } = useCurrentBlockchain();

  return (
    <div
      data-testid="header-menu-network-choice-container"
      className={cn(styles.menuItem, styles.cta)}
      onClick={() => onClick()}
    >
      <div className={styles.networkChoise}>
        <span data-testid="header-menu-network-choice-label">{t('browserView.topNavigationBar.links.network')}</span>
        <span data-testid="header-menu-network-choice-value" className={styles.value}>
          {getNetworkName(blockchain, environmentName)}
        </span>
      </div>
    </div>
  );
};
