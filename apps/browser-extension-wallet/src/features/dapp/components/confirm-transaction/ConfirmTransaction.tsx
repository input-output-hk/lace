import React, { useEffect, useState, useMemo } from 'react';
import cn from 'classnames';
import { Button, PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Layout } from '../Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import styles from './ConfirmTransaction.module.scss';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@stores';
import { useDisallowSignTx, useSignWithHardwareWallet, useOnBeforeUnload } from './hooks';
import { getTxTypes } from './utils';
import { ConfirmTransactionContent } from './ConfirmTransactionContent';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { txSubmitted$ } from '@providers/AnalyticsProvider/onChain';
import { useAnalyticsContext } from '@providers';
import { signingCoordinator } from '@lib/wallet-api-ui';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';
import { exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { UserPromptService } from '@lib/scripts/background/services';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { of, take } from 'rxjs';
import { runtime } from 'webextension-polyfill';
import { Skeleton } from 'antd';

export const ConfirmTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setNextView },
    setDappInfo,
    signTxRequest: { request: req, set: setSignTxRequest }
  } = useViewsFlowContext();

  const { walletType, isHardwareWallet } = useWalletStore();
  const analytics = useAnalyticsContext();
  const [confirmTransactionError, setConfirmTransactionError] = useState(false);
  const disallowSignTx = useDisallowSignTx();
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet();
  const [txTypes, setTxTypes] = useState<Wallet.Cip30TxType[]>();
  const tx = useMemo(() => req?.transaction.toCore(), [req?.transaction]);

  useEffect(() => {
    const fetchTxType = async () => {
      if (!tx) return;
      const types = await getTxTypes(tx);
      setTxTypes(types);
    };
    fetchTxType();
  }, [tx]);

  const onConfirm = () => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionSummaryConfirmClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });

    txSubmitted$.next({
      id: req.transaction.getId().toString(),
      date: new Date().toString(),
      creationType: TxCreationType.External
    });

    isHardwareWallet ? signWithHardwareWallet() : setNextView();
  };

  useEffect(() => {
    const subscription = signingCoordinator.transactionWitnessRequest$.pipe(take(1)).subscribe(async (r) => {
      setDappInfo(await senderToDappInfo(r.signContext.sender));
      setSignTxRequest(r);
    });

    const api = exposeApi<Pick<UserPromptService, 'readyToSignTx'>>(
      {
        api$: of({
          async readyToSignTx(): Promise<boolean> {
            return Promise.resolve(true);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { readyToSignTx: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );

    return () => {
      subscription.unsubscribe();
      api.shutdown();
    };
  }, [setSignTxRequest, setDappInfo]);

  useOnBeforeUnload(disallowSignTx);

  return (
    <Layout layoutClassname={cn(confirmTransactionError && styles.layoutError)} pageClassname={styles.spaceBetween}>
      {req && txTypes?.length ? (
        <ConfirmTransactionContent txTypes={txTypes} tx={tx} onError={() => setConfirmTransactionError(true)} />
      ) : (
        <Skeleton loading />
      )}
      {!confirmTransactionError && (
        <div className={styles.actions}>
          <Button
            onClick={onConfirm}
            loading={isHardwareWallet && isConfirmingTx}
            data-testid="dapp-transaction-confirm"
            className={styles.actionBtn}
          >
            {isHardwareWallet
              ? t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: walletType })
              : t('dapp.confirm.btn.confirm')}
          </Button>
          <Button
            color="secondary"
            data-testid="dapp-transaction-cancel"
            onClick={() => disallowSignTx(true)}
            className={styles.actionBtn}
          >
            {t('dapp.confirm.btn.cancel')}
          </Button>
        </div>
      )}
    </Layout>
  );
};
