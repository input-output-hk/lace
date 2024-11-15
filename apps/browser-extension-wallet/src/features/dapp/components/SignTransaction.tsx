import React, { useCallback, useState, useMemo } from 'react';
import { Spin } from 'antd';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { Button, PostHogAction } from '@lace/common';
import { Password, useSecrets } from '@lace/core';
import { useRedirection } from '@hooks';
import { dAppRoutePaths } from '@routes';
import { Layout } from './Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import styles from './SignTransaction.module.scss';
import { useAnalyticsContext } from '@providers';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { WalletType } from '@cardano-sdk/web-extension';

export const SignTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setPreviousView }
  } = useViewsFlowContext();
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const [isLoading, setIsLoading] = useState(false);
  const { password, setPassword, clearSecrets } = useSecrets();
  const [validPassword, setValidPassword] = useState<boolean>();
  const analytics = useAnalyticsContext();

  const {
    signTxRequest: { request }
  } = useViewsFlowContext();

  const onConfirm = useCallback(async () => {
    setIsLoading(true);
    analytics.sendEventToPostHog(PostHogAction.SendTransactionConfirmationConfirmClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });

    const passphrase = Buffer.from(password.value, 'utf8');
    try {
      await request.sign(passphrase, { willRetryOnFailure: true });
      setValidPassword(true);
      clearSecrets();
      passphrase.fill(0);
      redirectToSignSuccess();
    } catch (error) {
      if (error instanceof Wallet.KeyManagement.errors.AuthenticationError) {
        setValidPassword(false);
      } else {
        redirectToSignFailure();
      }
    } finally {
      clearSecrets();
      passphrase.fill(0);
      setIsLoading(false);
    }
  }, [password, analytics, redirectToSignFailure, redirectToSignSuccess, request]);

  const confirmIsDisabled = useMemo(() => {
    if (request.walletType !== WalletType.InMemory) return false;
    return !password;
  }, [request, password]);

  const onCancel = () => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionConfirmationCancelClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
    setPreviousView();
  };

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!confirmIsDisabled) {
        onConfirm();
      }
    },
    [onConfirm, confirmIsDisabled]
  );

  return (
    <Layout title={undefined}>
      <div className={styles.passwordContainer}>
        <Spin spinning={isLoading}>
          <h5 className={styles.message} data-testid="sign-transaction-description">
            {t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')}
          </h5>
          <Password
            onChange={setPassword}
            onSubmit={handleSubmit}
            error={validPassword === false}
            errorMessage={t('browserView.transaction.send.error.invalidPassword')}
            autoFocus
          />
        </Spin>
      </div>
      <div className={styles.actions}>
        <Button
          onClick={onConfirm}
          disabled={confirmIsDisabled}
          className={styles.actionBtn}
          data-testid="sign-transaction-confirm"
        >
          {t('dapp.confirm.btn.confirm')}
        </Button>
        <Button onClick={onCancel} color="secondary" className={styles.actionBtn} data-testid="sign-transaction-cancel">
          {t('dapp.confirm.btn.cancel')}
        </Button>
      </div>
    </Layout>
  );
};
