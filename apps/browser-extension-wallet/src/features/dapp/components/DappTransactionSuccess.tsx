import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { Image } from 'antd';
import Success from '../../../assets/icons/success-staking.svg';
import styles from './Layout.module.scss';

export const DappTransactionSuccess = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div data-testid="dapp-sign-tx-success" className={styles.noWalletContainer}>
      <div className={styles.noWalletContent}>
        <Image data-testid="dapp-sign-tx-success-image" preview={false} width={112} src={Success} />
        <div className={styles.heading}>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>
        <div className={styles.description}>{t('core.dappTransaction.signedSuccessfully')}</div>
      </div>
      <div className={styles.footer}>
        <Button data-test-id="window-close-btn" className={styles.footerBtn} onClick={() => window.close()}>
          {t('general.button.close')}
        </Button>
      </div>
    </div>
  );
};
