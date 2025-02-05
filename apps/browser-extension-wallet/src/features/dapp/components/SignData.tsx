import React, { useCallback, useState } from 'react';
import { Spin } from 'antd';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { Password, useSecrets } from '@lace/core';
import type { PasswordObj } from '@lace/core';
import { useRedirection } from '@hooks';
import { dAppRoutePaths } from '@routes';
import { Layout } from './Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import styles from './SignTransaction.module.scss';
import { WalletType } from '@cardano-sdk/web-extension';
import { createPassphrase } from '@lib/wallet-api-ui';
import { useOnUnload } from './confirm-transaction/hooks';

export const SignData = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setPreviousView },
    signDataRequest: { request }
  } = useViewsFlowContext();
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappDataSignFailure);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappDataSignSuccess);
  const [isLoading, setIsLoading] = useState(false);
  const [validPassword, setValidPassword] = useState<boolean>();
  const { password, setPassword, clearSecrets } = useSecrets();

  const onConfirm = useCallback(
    async (spendingPassphrase: Partial<PasswordObj>) => {
      setIsLoading(true);
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
    [redirectToSignFailure, redirectToSignSuccess, request, clearSecrets]
  );

  const confirmIsDisabled = request.walletType !== WalletType.InMemory || !password.value;

  const handleSubmit = useCallback(
    (event, passphrase) => {
      event.preventDefault();
      event.stopPropagation();

      if (!confirmIsDisabled) {
        onConfirm(passphrase);
      }
    },
    [onConfirm, confirmIsDisabled]
  );

  const cancelTransaction = useCallback(async () => {
    await request.reject('User rejected to sign');
    window.close();
  }, [request]);

  useOnUnload(cancelTransaction);

  return (
    <Layout title={undefined}>
      <div className={styles.passwordContainer}>
        <Spin spinning={isLoading}>
          <h5 className={styles.message}>
            {t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')}
          </h5>
          <Password
            onChange={setPassword}
            onSubmit={(e) => handleSubmit(e, password)}
            error={validPassword === false}
            errorMessage={t('browserView.transaction.send.error.invalidPassword')}
          />
        </Spin>
      </div>
      <div className={styles.actions}>
        <Button
          onClick={() => onConfirm(password)}
          disabled={confirmIsDisabled || !password.value || isLoading}
          className={styles.actionBtn}
          data-testid="sign-transaction-confirm"
        >
          {t('dapp.confirm.btn.confirm')}
        </Button>
        <Button
          onClick={setPreviousView}
          color="secondary"
          className={styles.actionBtn}
          data-testid="sign-transaction-cancel"
        >
          {t('dapp.confirm.btn.cancel')}
        </Button>
      </div>
    </Layout>
  );
};
