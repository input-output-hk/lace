import React, { useCallback, useState } from 'react';
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
import { createPassphrase } from '@lib/wallet-api-ui';
import { useDisallowSignTx, useOnUnload } from './confirm-transaction/hooks';

export const SignTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setPreviousView },
    signTxRequest: { request }
  } = useViewsFlowContext();
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const [isLoading, setIsLoading] = useState(false);
  const { password, setPassword, clearSecrets } = useSecrets();
  const [validPassword, setValidPassword] = useState<boolean>();
  const analytics = useAnalyticsContext();
  const disallowSignTx = useDisallowSignTx(request);

  const onConfirm = useCallback(
    async (spendingPassphrase) => {
      setIsLoading(true);
      analytics.sendEventToPostHog(PostHogAction.SendTransactionConfirmationConfirmClick, {
        [TX_CREATION_TYPE_KEY]: TxCreationType.External
      });

      const passphrase = createPassphrase(spendingPassphrase);
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
          clearSecrets();
          passphrase.fill(0);
          redirectToSignFailure();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [analytics, redirectToSignFailure, redirectToSignSuccess, request, clearSecrets]
  );

  const confirmIsDisabled = request.walletType !== WalletType.InMemory || !password.value;

  const onCancel = () => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionConfirmationCancelClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
    setPreviousView();
  };

  const handleSubmit = useCallback(
    (event, spendingPassphrase) => {
      event.preventDefault();
      event.stopPropagation();

      if (!confirmIsDisabled) {
        onConfirm(spendingPassphrase);
      }
    },
    [onConfirm, confirmIsDisabled]
  );

  useOnUnload(() => disallowSignTx(true));

  return (
    <Layout title={undefined}>
      <div className={styles.passwordContainer}>
        <Spin spinning={isLoading}>
          <h5 className={styles.message} data-testid="sign-transaction-description">
            {t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')}
          </h5>
          <Password
            onChange={setPassword}
            onSubmit={(e) => handleSubmit(e, password)}
            error={validPassword === false}
            errorMessage={t('browserView.transaction.send.error.invalidPassword')}
            autoFocus
          />
        </Spin>
      </div>
      <div className={styles.actions}>
        <Button
          onClick={() => onConfirm(password)}
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
