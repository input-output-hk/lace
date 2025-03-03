import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ResultMessage } from '@components/ResultMessage';
import { useAnalyticsContext } from '@providers';
import { PostHogAction, TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import styles from './TransactionSuccessView.module.scss';
import { useAnalyticsSendFlowTriggerPoint, useBuiltTxState } from '../store';
import { WarningBanner } from '@lace/common';
import { useWalletStore } from '@src/stores';
import { Box, SummaryExpander, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';

interface TransactionFailProps {
  showCustomApiBanner?: boolean;
}

export const TransactionFail = ({ showCustomApiBanner = false }: TransactionFailProps): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const { triggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const { isSharedWallet } = useWalletStore();
  const { builtTxData } = useBuiltTxState();
  const { error } = builtTxData || {};

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
        fullWidth
        title={<div data-testid="send-error-title">{t('browserView.transaction.fail.oopsSomethingWentWrong')}</div>}
        description={
          <>
            <div data-testid="send-error-description">
              {t('browserView.transaction.fail.problemSubmittingYourTransaction')}
            </div>
            <div data-testid="send-error-description2" className={styles.errorMessage}>
              {t('browserView.transaction.fail.clickBackAndTryAgain')}
            </div>
            {showCustomApiBanner && <WarningBanner message={t('drawer.failure.customSubmitApiWarning')} />}
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
