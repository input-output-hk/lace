import React, { useState } from 'react';
import { Button } from '@lace/common';
import styles from './SendFlow.module.scss';
import { ResultMessage } from '@components/ResultMessage';
import { useTranslation } from 'react-i18next';
import { Box, Flex, SummaryExpander } from '@input-output-hk/lace-ui-toolkit';
import { useDrawer } from '@src/views/browser-view/stores';
import { TransactionHashBox } from '@components/TransactionHashBox';

interface TransactionSuccessProps {
  hash: string;
  onViewTransaction: () => void;
}

export const TransactionSuccess: React.FC<TransactionSuccessProps> = ({ hash, onViewTransaction }) => {
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
        data-testid="transaction-success-container"
        className={styles.container}
      >
        <ResultMessage
          title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
          description={
            <>
              <div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>
              <Box w="$fill">
                <SummaryExpander
                  onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                  open={isSummaryOpen}
                  title="Transaction hash"
                  plain
                >
                  <TransactionHashBox hash={hash} />
                </SummaryExpander>
              </Box>
            </>
          }
        />
      </Flex>
      <Flex w="$fill" py="$24" px="$40" flexDirection="column" gap="$16" className={styles.buttons}>
        <Button color="primary" block size="medium" onClick={onViewTransaction} data-testid="continue-button">
          {t('browserView.transaction.send.footer.review')}
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
