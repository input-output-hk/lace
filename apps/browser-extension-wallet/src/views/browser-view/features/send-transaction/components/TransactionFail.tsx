import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ResultMessage } from '@components/ResultMessage';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import styles from './TransactionSuccessView.module.scss';

export const TransactionFail = (): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    analytics.sendEventToPostHog(PostHogAction.SendSomethingWentWrongView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="tx-fail-container" className={styles.successTxContainer}>
      <ResultMessage
        status="error"
        title={
          <>
            <div data-testid="send-error-title">{t('browserView.transaction.fail.oopsSomethingWentWrong')}</div>
          </>
        }
        description={
          <>
            <div data-testid="send-error-description">
              {t('browserView.transaction.fail.problemSubmittingYourTransaction')}
            </div>
            <div data-testid="send-error-description2">{t('browserView.transaction.fail.clickBackAndTryAgain')}</div>
          </>
        }
      />
    </div>
  );
};
