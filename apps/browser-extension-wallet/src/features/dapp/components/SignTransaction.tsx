import React, { useCallback, useState, useMemo } from 'react';
import { Spin } from 'antd';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { Button, inputProps, Password } from '@lace/common';
import { useWalletStore } from '@stores';
import { useRedirection, useWalletManager } from '@hooks';
import { dAppRoutePaths } from '@routes';
import { Layout } from './Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import styles from './SignTransaction.module.scss';
import { exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { UserPromptService } from '@lib/scripts/background/services';
import { of } from 'rxjs';

export const SignTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setPreviousView }
  } = useViewsFlowContext();
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const { executeWithPassword } = useWalletManager();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState<string>();
  const [validPassword, setValidPassword] = useState<boolean>();
  const { keyAgentData } = useWalletStore();

  const handleVerifyPass = useCallback(async () => {
    setIsLoading(true);
    try {
      const valid = await Wallet.validateWalletPassword(keyAgentData, password);
      setValidPassword(valid);
      if (!valid) return;
      exposeApi<Pick<UserPromptService, 'allowSignTx'>>(
        {
          api$: of({
            allowSignTx(): Promise<boolean> {
              return Promise.resolve(valid);
            }
          }),
          baseChannel: DAPP_CHANNELS.userPrompt,
          properties: { allowSignTx: RemoteApiPropertyType.MethodReturningPromise }
        },
        { logger: console, runtime }
      );
    } catch {
      redirectToSignFailure();
    } finally {
      setIsLoading(false);
    }
  }, [password, redirectToSignFailure, keyAgentData]);

  const onConfirm = useCallback(
    () => executeWithPassword(password, handleVerifyPass, false),
    [executeWithPassword, handleVerifyPass, password]
  );

  const handleChange: inputProps['onChange'] = ({ target: { value } }) => setPassword(value);

  const confirmIsDisabled = useMemo(() => {
    if (keyAgentData.__typename !== 'InMemory') return false;
    return !password;
  }, [keyAgentData.__typename, password]);

  return (
    <Layout title={undefined}>
      <div className={styles.passwordContainer}>
        <Spin spinning={isLoading}>
          <h5 className={styles.message} data-testid="sign-transaction-description">
            {t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')}
          </h5>
          <Password
            onChange={handleChange}
            value={password}
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
