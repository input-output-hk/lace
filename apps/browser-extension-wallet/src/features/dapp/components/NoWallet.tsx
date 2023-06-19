import React from 'react';
import { Image } from 'antd';
import { useTranslation } from 'react-i18next';
import Empty from '../../../assets/icons/empty.svg';
import styles from './Layout.module.scss';
import { Button } from '@lace/common';
import { tabs } from 'webextension-polyfill';

const openCreatePage = () => {
  tabs.create({ url: 'app.html#/setup' });
  window.close();
};

export const NoWallet = (): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div data-testid="no-wallet-container" className={styles.noWalletContainer}>
      <div className={styles.noWalletContent}>
        <Image data-testid="no-wallet-image" preview={false} width={112} src={Empty} />
        <div className={styles.heading} data-testid="no-wallet-heading">
          {t('dapp.noWallet.heading')}
        </div>
        <div className={styles.description} data-testid="no-wallet-description">
          {t('dapp.noWallet.description')}
        </div>
      </div>
      <div className={styles.footer}>
        <Button data-testid="create-or-restore-wallet-btn" className={styles.footerBtn} onClick={openCreatePage}>
          {t('dapp.nowallet.btn')}
        </Button>
      </div>
    </div>
  );
};
