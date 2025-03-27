import React, { useState } from 'react';
import { Button } from '@lace/common';
import styles from './SendFlow.module.scss';
import { ResultMessage } from '@components/ResultMessage';
import { useTranslation } from 'react-i18next';
import { Box, Flex, SummaryExpander } from '@input-output-hk/lace-ui-toolkit';
import { TransactionHashBox } from '@components/TransactionHashBox';

interface TransactionSuccessProps {
  hash: string;
  onViewTransaction: () => void;
  isPopupView: boolean;
  onClose: () => void;
}

export const TransactionSuccess: React.FC<TransactionSuccessProps> = ({
  hash,
  onViewTransaction,
  isPopupView,
  onClose
}) => {
  const { t } = useTranslation();

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
            <Flex flexDirection="column" gap="$60">
              <div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>
              <Box w="$fill">
                <SummaryExpander
                  onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                  open={isSummaryOpen}
                  title="Transaction hash"
                  plain
                >
                  <Flex justifyContent="center">
                    <TransactionHashBox hash={hash} />
                  </Flex>
                </SummaryExpander>
              </Box>
            </Flex>
          }
        />
      </Flex>
      <Flex
        w="$fill"
        py="$24"
        pb={isPopupView ? '$0' : '$24'}
        px="$40"
        flexDirection="column"
        gap={isPopupView ? '$8' : '$16'}
        className={styles.buttons}
      >
        <Button color="primary" block size="medium" onClick={onViewTransaction} data-testid="continue-button">
          {t('browserView.transaction.send.footer.review')}
        </Button>
        <Button color="secondary" block size="medium" onClick={onClose} data-testid="back-button">
          {t('browserView.transaction.send.footer.cancel')}
        </Button>
      </Flex>
    </Flex>
  );
};
