import React, { ReactElement, useMemo } from 'react';
import classnames from 'classnames';
import styles from './NetworkPill.module.scss';
import { useWalletStore } from '@src/stores';
import { useNetwork } from '@hooks';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

interface NetworkPillProp {
  isExpandablePill?: boolean;
}

export const NetworkPill = ({ isExpandablePill }: NetworkPillProp): ReactElement => {
  const { environmentName } = useWalletStore();
  const { t } = useTranslation();
  const { isOnline, isBackendFailing } = useNetwork();

  return useMemo(() => {
    if (isOnline && !isBackendFailing && environmentName !== 'Mainnet') {
      return (
        <div
          className={classnames(styles.networkPill, { [styles.expandablePill]: isExpandablePill })}
          data-testid="network-pill"
        >
          <span className={classnames({ [styles.networkPillText]: isExpandablePill })}>{environmentName}</span>
        </div>
      );
    }
    if (!isOnline) {
      return (
        <Tooltip title={t('general.networks.error')} placement="rightBottom">
          <div
            className={classnames(styles.offlinePill, { [styles.expandablePill]: isExpandablePill })}
            data-testid="network-pill"
          >
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
          <div
            className={classnames(styles.offlinePill, { [styles.expandablePill]: isExpandablePill })}
            data-testid="backend-pill"
          >
            <div className={styles.offlinePillText}>
              <div className={styles.dot}>&#x2022;</div>
              <div data-testid="network-poor-indicator">{t('general.networks.connectionUnavailable.title')}</div>
            </div>
          </div>
        </Tooltip>
      );
    }
    return <></>;
  }, [isOnline, isBackendFailing, environmentName, t, isExpandablePill]);
};
