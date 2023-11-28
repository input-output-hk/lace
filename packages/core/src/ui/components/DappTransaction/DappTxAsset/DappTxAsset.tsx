import React from 'react';
import styles from './DappTxAsset.module.scss';
import { Ellipsis } from '@lace/common';
import { useTranslate } from '@src/ui/hooks';

export interface DappTxAssetProps {
  name: string;
  amount: string;
  ticker?: string;
}

export const DappTxAsset = ({ amount, name, ticker }: DappTxAssetProps): React.ReactElement => {
  const { t } = useTranslate();
  return (
    <div className={styles.body}>
      <div className={styles.detail}>
        <div className={styles.title}>{t('package.core.dappTransaction.asset')}</div>
        <div className={styles.value}>
          <Ellipsis className={styles.ellipsis} text={ticker ?? name} ellipsisInTheMiddle />
        </div>
      </div>
      <div className={styles.detail}>
        <div className={styles.title}>{t('package.core.dappTransaction.quantity')}</div>
        <div className={styles.value}>{amount}</div>
      </div>
    </div>
  );
};
