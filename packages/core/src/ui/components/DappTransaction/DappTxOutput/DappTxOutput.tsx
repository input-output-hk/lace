import React from 'react';
import { Ellipsis } from '@lace/common';
import styles from './DappTxOutput.module.scss';
import { useTranslate } from '@src/ui/hooks';
import { Wallet } from '@lace/cardano';

export interface DappTxOutputProps {
  coins: string;
  recipient: string;
  assets?: Wallet.Cip30SignTxAssetItem[];
}

export const DappTxOutput = ({ recipient, coins, assets }: DappTxOutputProps): React.ReactElement => {
  const { t } = useTranslate();
  return (
    <div className={styles.body}>
      <div className={styles.detail}>
        <div data-testid="dapp-transaction-amount-title" className={styles.title}>
          {t('core.dappTransaction.sending')}
        </div>
        <div className={styles.value}>
          <div data-testid="dapp-transaction-amount-value" className={styles.bold}>
            {coins.toString()} ADA
          </div>
          {assets?.map((asset) => (
            <div data-testid="dapp-transaction-asset" className={styles.bold} key={asset.name.toString()}>
              {asset.amount} {asset.ticker || asset.name}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.detail}>
        <div data-testid="dapp-transaction-recipient-title" className={styles.title}>
          {t('core.dappTransaction.recipient')}
        </div>
        <div data-testid="dapp-transaction-recipient-address" className={styles.value}>
          <Ellipsis className={styles.rightAligned} text={recipient} ellipsisInTheMiddle />
        </div>
      </div>
    </div>
  );
};
