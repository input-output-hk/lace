import React, { useCallback, useState, useMemo } from 'react';
import { Spin } from 'antd';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { Password, useSecrets } from '@lace/core';
import { useRedirection } from '@hooks';
import { dAppRoutePaths } from '@routes';
import { Layout } from './Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import styles from './SignTransaction.module.scss';
import { WalletType } from '@cardano-sdk/web-extension';

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

  const onConfirm = useCallback(async () => {
    setIsLoading(true);
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
      passphrase.fill(0);
      clearSecrets();
      setIsLoading(false);
    }
  }, [password, redirectToSignFailure, redirectToSignSuccess, request, clearSecrets]);

  const confirmIsDisabled = useMemo(() => {
    if (request.walletType !== WalletType.InMemory) return false;
    return !password;
  }, [request, password]);

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
          <h5 className={styles.message}>
            {t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')}
          </h5>
          <Password
            onChange={setPassword}
            onSubmit={handleSubmit}
            error={validPassword === false}
            errorMessage={t('browserView.transaction.send.error.invalidPassword')}
          />
        </Spin>
      </div>
      <div className={styles.actions}>
        <Button
          onClick={onConfirm}
          disabled={confirmIsDisabled || isLoading}
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
