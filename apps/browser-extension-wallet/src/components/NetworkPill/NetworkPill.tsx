import React, { ReactElement, useMemo } from 'react';
import classnames from 'classnames';
import styles from './NetworkPill.module.scss';
import { useWalletStore } from '@src/stores';
import { useNetwork } from '@hooks';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { Blockchain, useCurrentBlockchain } from '@src/multichain';
import { getNetworkName, isBitcoinNetworkSwitchingDisabled } from '@src/utils/get-network-name';

interface NetworkPillProp {
  isExpandable?: boolean;
  isPopup?: boolean;
}

export const NetworkPill = ({ isExpandable, isPopup = false }: NetworkPillProp): ReactElement => {
  const { environmentName } = useWalletStore();
  const { t } = useTranslation();
  const { isOnline, isBackendFailing } = useNetwork();
  const { blockchain } = useCurrentBlockchain();

  // eslint-disable-next-line complexity
  return useMemo(() => {
    if (isOnline && !isBackendFailing && blockchain === Blockchain.Bitcoin && isBitcoinNetworkSwitchingDisabled()) {
      return (
        <div
          className={classnames(styles.networkPill, {
            [styles.expandablePill]: isExpandable,
            [styles.multiWallet]: process.env.USE_MULTI_WALLET === 'true' && isPopup
          })}
          data-testid="network-pill"
        >
          <span
            className={classnames({
              [styles.networkPillText]: isExpandable
            })}
          >
            Testnet4
          </span>
        </div>
      );
    }

    if (isOnline && !isBackendFailing && environmentName !== 'Mainnet') {
      return (
        <div
          className={classnames(styles.networkPill, {
            [styles.expandablePill]: isExpandable,
            [styles.multiWallet]: process.env.USE_MULTI_WALLET === 'true' && isPopup
          })}
          data-testid="network-pill"
        >
          <span
            className={classnames({
              [styles.networkPillText]: isExpandable
            })}
          >
            {getNetworkName(blockchain, environmentName)}
          </span>
        </div>
      );
    }
    if (!isOnline) {
      return (
        <Tooltip title={t('general.networks.error')} placement="rightBottom">
          <div
            className={classnames(styles.offlinePill, {
              [styles.expandablePill]: isExpandable,
              [styles.multiWallet]: process.env.USE_MULTI_WALLET === 'true' && isPopup
            })}
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
            className={classnames(styles.offlinePill, {
              [styles.expandablePill]: isExpandable,
              [styles.multiWallet]: process.env.USE_MULTI_WALLET === 'true' && isPopup
            })}
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
  }, [isOnline, isBackendFailing, environmentName, t, isExpandable, blockchain]); // eslint-disable-line react-hooks/exhaustive-deps
};
