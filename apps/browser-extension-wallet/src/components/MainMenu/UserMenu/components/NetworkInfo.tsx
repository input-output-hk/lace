import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationButton } from '@lace/common';
import styles from './NetworkInfo.module.scss';
import { NetworkChoice } from '@src/features/settings';

type NetworkChoiseProps = {
  onBack: () => void;
};

export const NetworkInfo = ({ onBack }: NetworkChoiseProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div data-testid="user-dropdown-network-info-section" className={styles.container}>
      <div className={styles.navigation} data-testid="drawer-navigation">
        <NavigationButton iconClassName={styles.iconClassName} icon="arrow" onClick={onBack} />
      </div>
      <div className={styles.titleSection}>
        <div data-testid="user-dropdown-network-title" className={styles.title}>
          {t('browserView.settings.wallet.network.title')}
        </div>
        <div data-testid="user-dropdown-network-description" className={styles.subTitle}>
          {t('browserView.settings.wallet.network.drawerDescription')}
        </div>
      </div>
      <div className={styles.content} data-testid="user-dropdown-network-choice">
        <NetworkChoice section="wallet-profile" />
      </div>
    </div>
  );
};
