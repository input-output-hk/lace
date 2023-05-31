import React, { ReactElement, useMemo } from 'react';
import styles from './NetworkPill.module.scss';
import { useWalletStore } from '@src/stores';
import { useNetwork } from '@hooks';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

export const NetworkPill = (): ReactElement => {
  const { environmentName } = useWalletStore();
  const { t } = useTranslation();
  const { isOnline, isBackendFailing } = useNetwork();

  return useMemo(() => {
    if (isOnline && !isBackendFailing && environmentName !== 'Mainnet') {
      return (
        <div className={styles.networkPill} data-testid="network-pill">
          {environmentName}
        </div>
      );
    }
    if (!isOnline) {
      return (
        <Tooltip title={t('general.networks.error')} placement="rightBottom">
          <div className={styles.offlinePill} data-testid="network-pill">
            <div className={styles.offlinePillText}>
              <div className={styles.dot}>&#x2022;</div>
              <div data-testid="network-offline-indicator">{t('general.networks.offline')}</div>
            </div>
          </div>
        </Tooltip>
      );
    }
    if (isBackendFailing) {
      return (
        <Tooltip title={t('general.networks.connectionUnavailable.error')} placement="rightBottom">
          <div className={styles.offlinePill} data-testid="backend-pill">
            <div className={styles.offlinePillText}>
              <div className={styles.dot}>&#x2022;</div>
              <div data-testid="network-poor-indicator">{t('general.networks.connectionUnavailable.title')}</div>
            </div>
          </div>
        </Tooltip>
      );
    }
    return <></>;
  }, [isOnline, isBackendFailing, environmentName, t]);
};
