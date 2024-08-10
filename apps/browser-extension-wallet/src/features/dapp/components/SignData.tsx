import React, { useCallback, useState, useMemo } from 'react';
import { Spin } from 'antd';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { Button, OnPasswordChange, Password } from '@lace/common';
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
  const [password, setPassword] = useState<string>();
  const [validPassword, setValidPassword] = useState<boolean>();

  const onConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      const passphrase = Buffer.from(password, 'utf8');
      await request.sign(passphrase, { willRetryOnFailure: true });
      setValidPassword(true);
      redirectToSignSuccess();
    } catch (error) {
      if (error instanceof Wallet.KeyManagement.errors.AuthenticationError) {
        setValidPassword(false);
      } else {
        redirectToSignFailure();
      }
    } finally {
      setIsLoading(false);
    }
  }, [password, redirectToSignFailure, redirectToSignSuccess, request]);

  const handleChange: OnPasswordChange = (target) => setPassword(target.value);

  const confirmIsDisabled = useMemo(() => {
    if (request.walletType !== WalletType.InMemory) return false;
    return !password;
  }, [request, password]);

  return (
    <Layout title={undefined}>
      <div className={styles.passwordContainer}>
        <Spin spinning={isLoading}>
          <h5 className={styles.message}>
            {t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')}
          </h5>
          <Password
            onChange={handleChange}
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
