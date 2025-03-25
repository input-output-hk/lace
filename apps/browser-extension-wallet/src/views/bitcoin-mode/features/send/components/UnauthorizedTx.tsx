import React from 'react';
import styles from './SendFlow.module.scss';
import { ResultMessage } from '@components/ResultMessage';
import { useTranslation } from 'react-i18next';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { Button } from '@lace/common';

interface UnauthorizedTxProps {
  onBack: () => void;
  isPopupView: boolean;
  onClose: () => void;
}

export const UnauthorizedTx: React.FC<UnauthorizedTxProps> = ({ onBack, isPopupView, onClose }) => {
  const { t } = useTranslation();
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
                {t('browserView.transaction.fail.unauthorizedTransaction')}
              </div>
              <div data-testid="send-error-description2">{t('browserView.transaction.fail.clickBackAndTryAgain')}</div>
            </>
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
        <Button color="primary" block size="medium" onClick={onBack} data-testid="continue-button">
          {t('browserView.transaction.send.footer.fail')}
        </Button>
        <Button color="secondary" block size="medium" onClick={onClose} data-testid="back-button">
          {t('browserView.transaction.send.footer.cancel')}
        </Button>
      </Flex>
    </Flex>
  );
};
