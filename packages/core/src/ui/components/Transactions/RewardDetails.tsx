import React from 'react';
import cn from 'classnames';
import styles from './TransactionDetailBrowser.module.scss';
import { useTranslate } from '@src/ui/hooks';
import { TransactionStatus } from '../Activity/AssetActivityItem';

export interface RewardDetailsProps {
  name: string;
  status?: TransactionStatus;
  includedDate?: string;
  includedTime?: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  rewards?: string;
}

export const RewardDetails = ({
  name,
  status,
  includedDate = '-',
  includedTime = '-',
  amountTransformer,
  coinSymbol,
  rewards
}: RewardDetailsProps): React.ReactElement => {
  const { t } = useTranslate();
  return (
    <div>
      <div className={styles.header}>{t('package.core.transactionDetailBrowser.header')}</div>
      <h1 className={styles.summary}>{t('package.core.transactionDetailBrowser.summary')}</h1>
      <div className={styles.block}>
        <div data-testid="tx-detail-bundle">
          <div className={styles.details}>
            <div className={styles.title}>{name}</div>
            <div data-testid="tx-sent-detail" className={styles.detail}>
              <div className={styles.amount}>
                <span className={styles.ada} data-testid="tx-sent-detail-ada">{`${rewards} ${coinSymbol}`}</span>
                <span className={styles.fiat} data-testid="tx-sent-detail-fiat">{`${amountTransformer(rewards)}`}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.details}>
          <div className={styles.title}>{t('package.core.transactionDetailBrowser.status')}</div>
          {status && (
            <div data-testid="tx-status" className={styles.detail}>{`${status.charAt(0).toUpperCase()}${status.slice(
              1
            )}`}</div>
          )}
        </div>
        <div data-testid="tx-date" className={cn(styles.details, styles.timestampContainer)}>
          <div className={cn(styles.title, styles.timestamp)}>
            {t('package.core.transactionDetailBrowser.timestamp')}
          </div>
          <div data-testid="tx-timestamp" className={styles.detail}>
            <span>{includedDate}</span>
            <span>&nbsp;{includedTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
