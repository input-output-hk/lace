import React, { useState } from 'react';
import { Button } from '@lace/common';
import styles from './SendFlow.module.scss';
import { ResultMessage } from '@components/ResultMessage';
import { useTranslation } from 'react-i18next';
import { Box, Flex, SummaryExpander, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { useDrawer } from '@src/views/browser-view/stores';

interface TransactionFailedProps {
  txError?: Error;
  onBack: () => void;
}

export const TransactionFailed: React.FC<TransactionFailedProps> = ({ txError, onBack }) => {
  const { t } = useTranslation();
  const [config, clearContent] = useDrawer();

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  return (
    <Flex flexDirection="column" w="$fill" className={styles.container}>
      <Flex
        w="$fill"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        data-testid="tx-fail-container"
        className={styles.container}
      >
        <ResultMessage
          status="error"
          title={<div data-testid="send-error-title">{t('browserView.transaction.fail.oopsSomethingWentWrong')}</div>}
          description={
            <>
              <div data-testid="send-error-description">
                {t('browserView.transaction.fail.problemSubmittingYourTransaction')}
              </div>
              <div data-testid="send-error-description2">{t('browserView.transaction.fail.clickBackAndTryAgain')}</div>
              {typeof txError === 'object' && txError.message && (
                <Box w="$fill">
                  <SummaryExpander
                    onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                    open={isSummaryOpen}
                    title="Show issue details"
                    plain
                  >
                    <TransactionSummary.Other label={txError.name} text={txError.message} />
                  </SummaryExpander>
                </Box>
              )}
            </>
          }
        />
      </Flex>
      <Flex w="$fill" py="$24" px="$40" flexDirection="column" gap="$16" className={styles.buttons}>
        <Button color="primary" block size="medium" onClick={onBack} data-testid="continue-button">
          {t('browserView.transaction.send.footer.fail')}
        </Button>
        <Button
          color="secondary"
          block
          size="medium"
          onClick={() => (config?.onClose ? config?.onClose() : clearContent())}
          data-testid="back-button"
        >
          {t('browserView.transaction.send.footer.cancel')}
        </Button>
      </Flex>
    </Flex>
  );
};
