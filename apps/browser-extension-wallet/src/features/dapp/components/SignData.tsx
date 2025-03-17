import React, { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Spin } from 'antd';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { Button, useAutoFocus } from '@lace/common';
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
import { parseError } from '@src/utils/parse-error';

const inputId = `id-${uuidv4()}`;

export const SignData = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setPreviousView },
    signDataRequest: { request },
    signError
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
          signError.set(parseError(error));
          clearSecrets();
          passphrase.fill(0);
          redirectToSignFailure();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [request, clearSecrets, redirectToSignSuccess, signError, redirectToSignFailure]
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

  useAutoFocus(inputId, true);

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
            id={inputId}
            autoFocus
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
