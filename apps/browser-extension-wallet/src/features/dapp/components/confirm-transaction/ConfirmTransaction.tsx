import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import { Button, PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Layout } from '../Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import styles from './ConfirmTransaction.module.scss';
import { useWalletStore } from '@stores';
import { useDisallowSignTx, useSignWithHardwareWallet, useOnBeforeUnload } from './hooks';
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
import { DappTransactionContainer } from './DappTransactionContainer';

export const ConfirmTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setNextView },
    setDappInfo,
    signTxRequest: { request: req, set: setSignTxRequest }
  } = useViewsFlowContext();
  const { walletType, isHardwareWallet } = useWalletStore();
  const analytics = useAnalyticsContext();
  const [confirmTransactionError] = useState(false);
  const disallowSignTx = useDisallowSignTx(req);
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet(req);

  const onConfirmTransaction = () => {
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

  const onCancelTransaction = () => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionSummaryCancelClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
    disallowSignTx(true);
  };

  useOnBeforeUnload(disallowSignTx);

  return (
    <Layout layoutClassname={cn(confirmTransactionError && styles.layoutError)} pageClassname={styles.spaceBetween}>
      {req ? <DappTransactionContainer /> : <Skeleton loading />}
      {!confirmTransactionError && (
        <div className={styles.actions}>
          <Button
            onClick={onConfirmTransaction}
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
            onClick={onCancelTransaction}
            className={styles.actionBtn}
          >
            {t('dapp.confirm.btn.cancel')}
          </Button>
        </div>
      )}
    </Layout>
  );
};
