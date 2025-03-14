import React from "react";
import styles from "./TransactionFailed.module.scss";
import { ResultMessage } from "@components/ResultMessage";
import { useTranslation } from "react-i18next";

export const UnauthorizedTx: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
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
              <div data-testid="send-error-description">{t('browserView.transaction.fail.unauthorizedTransaction')}</div>
              <div data-testid="send-error-description2">{t('browserView.transaction.fail.clickBackAndTryAgain')}</div>
            </>
          }
        />
      </div>
    </div>
  );
};
