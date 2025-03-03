import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ResultMessage } from '@components/ResultMessage';
import { useAnalyticsContext } from '@providers';
import { PostHogAction, TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import styles from './TransactionSuccessView.module.scss';
import { useAnalyticsSendFlowTriggerPoint, useBuiltTxState } from '../store';
import { Box, SummaryExpander, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';

export const UnauthorizedTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const { triggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const { builtTxData } = useBuiltTxState();
  const { error } = builtTxData || {};

  useEffect(() => {
    analytics.sendEventToPostHog(PostHogAction.SendSomethingWentWrongView, {
      // eslint-disable-next-line camelcase
      trigger_point: triggerPoint,
      [TX_CREATION_TYPE_KEY]: TxCreationType.Internal
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="tx-fail-container" className={styles.successTxContainer}>
      <ResultMessage
        fullWidth
        status="error"
        title={
          <>
            <div data-testid="send-error-title">{t('browserView.transaction.fail.oopsSomethingWentWrong')}</div>
          </>
        }
        description={
          <>
            <div data-testid="send-error-description">{t('browserView.transaction.fail.unauthorizedTransaction')}</div>
            <div data-testid="send-error-description2">{t('browserView.transaction.fail.clickBackAndTryAgain')}</div>
            {typeof error === 'object' && error.message && (
              <Box w="$fill">
                <SummaryExpander title={t('browserView.transaction.fail.error-details.label')} plain>
                  <TransactionSummary.Other
                    label={error.name || t('browserView.transaction.fail.error-details.error-name-fallback')}
                    text={error.message}
                  />
                </SummaryExpander>
              </Box>
            )}
          </>
        }
      />
    </div>
  );
};
