import React from 'react';
import styles from './TransactionSuccess.module.scss';
import { ResultMessage } from '@components/ResultMessage';
import { TransactionHashBox } from '@components/TransactionHashBox';
import { useTranslation } from 'react-i18next';

interface TransactionSuccessProps {
  hash: string;
}

export const TransactionSuccess: React.FC<TransactionSuccessProps> = ({ hash }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className={styles.successTxContainer} data-testid="transaction-success-container">
        <>
          <ResultMessage
            title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
            description={<div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>}
          />
          <TransactionHashBox hash={hash} />
        </>
      </div>
    </>
  );
};
