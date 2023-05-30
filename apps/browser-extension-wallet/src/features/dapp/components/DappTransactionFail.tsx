import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import Fail from '../../../assets/icons/exclamation-circle.svg';
import styles from './Layout.module.scss';
import { Image } from 'antd';

export const DappTransactionFail = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div data-testid="dapp-sign-tx-fail" className={styles.noWalletContainer}>
      <div className={styles.noWalletContent}>
        <Image data-testid="dapp-sign-tx-fail-image" preview={false} width={112} src={Fail} />
        <div className={styles.heading}>{t('dapp.sign.failure.title')}</div>
        <div className={styles.description}>{t('dapp.sign.failure.description')}</div>
      </div>
      <div className={styles.footer}>
        <Button onClick={() => window.close()} color="secondary" className={styles.footerBtn}>
          {t('general.button.cancel')}
        </Button>
      </div>
    </div>
  );
};
