import { ResultMessage } from '@components/ResultMessage';
import { TransactionHashBox } from '@components/TransactionHashBox';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useBuiltTxState } from '@views/browser/features/send-transaction';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TransactionSuccessView.module.scss';

export const TransactionSuccessView = ({ footerSlot }: { footerSlot?: React.ReactElement }): React.ReactElement => {
  const { t } = useTranslation();
  const { builtTxData: { uiTx: { hash } = {} } = {} } = useBuiltTxState();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    analytics.sendEventToPostHog(PostHogAction.SendAllDoneView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={styles.successTxContainer} data-testid="transaction-success-container">
        <ResultMessage
          title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
          description={<div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>}
        />
        <TransactionHashBox hash={hash?.toString()} />
      </div>
      {footerSlot}
    </>
  );
};
