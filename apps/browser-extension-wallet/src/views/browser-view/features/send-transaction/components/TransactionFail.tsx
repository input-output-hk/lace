import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ResultMessage } from '@components/ResultMessage';
import { useAnalyticsContext } from '@providers';
import { PostHogAction, TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import styles from './TransactionSuccessView.module.scss';
import { useAnalyticsSendFlowTriggerPoint } from '../store';
import { WarningBanner } from '@lace/common';
import { useWalletStore } from '@src/stores';

interface TransactionFailProps {
  showCustomApiBanner?: boolean;
}

export const TransactionFail = ({ showCustomApiBanner = false }: TransactionFailProps): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const { triggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const { isSharedWallet } = useWalletStore();

  useEffect(() => {
    analytics.sendEventToPostHog(
      PostHogAction[isSharedWallet ? 'SharedWalletsSendSomethingWentWrongView' : 'SendSomethingWentWrongView'],
      {
        // eslint-disable-next-line camelcase
        trigger_point: triggerPoint,
        [TX_CREATION_TYPE_KEY]: TxCreationType.Internal
      }
    );
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
            <div data-testid="send-error-description2" className={styles.message}>
              {t('browserView.transaction.fail.clickBackAndTryAgain')}
            </div>
            {showCustomApiBanner && <WarningBanner message={t('drawer.failure.customSubmitApiWarning')} />}
          </>
        }
      />
    </div>
  );
};
