import { ResultMessage } from '@components/ResultMessage';
import { TransactionHashBox } from '@components/TransactionHashBox';
import { useBuitTxState } from '@views/browser/features/send-transaction';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TransactionSuccessView.module.scss';

export const TransactionSuccessView = ({ footerSlot }: { footerSlot?: React.ReactElement }): React.ReactElement => {
  const { t } = useTranslation();
  const { builtTxData } = useBuitTxState();
  return (
    <>
      <div className={styles.successTxContainer} data-testind="transaction-success-container">
        <ResultMessage
          title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
          description={<div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>}
        />
        <TransactionHashBox hash={builtTxData?.tx?.hash.toString()} />
      </div>
      {footerSlot}
    </>
  );
};
