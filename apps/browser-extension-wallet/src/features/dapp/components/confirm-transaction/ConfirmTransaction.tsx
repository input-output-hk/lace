import React, { useCallback, useEffect, useState } from 'react';
import cn from 'classnames';
import { Button, logger, PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Layout } from '../Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import styles from './ConfirmTransaction.module.scss';
import { useWalletStore } from '@stores';
import { useDisallowSignTx, useSignWithHardwareWallet, useOnUnload } from './hooks';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { txSubmitted$ } from '@providers/AnalyticsProvider/onChain';
import { useAnalyticsContext } from '@providers';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';
import { exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { UserPromptService } from '@lib/scripts/background/services';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';
import { Skeleton } from 'antd';
import { DappTransactionContainer } from './DappTransactionContainer';
import { useTxWitnessRequest } from '@providers/TxWitnessRequestProvider';
import { useRedirection } from '@hooks';
import { dAppRoutePaths } from '@routes';

export const ConfirmTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setNextView },
    setDappInfo,
    signTxRequest: { request: req, set: setSignTxRequest }
  } = useViewsFlowContext();
  const { walletType, isHardwareWallet, walletInfo, inMemoryWallet } = useWalletStore();
  const redirectToDappTxSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
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

  const txWitnessRequest = useTxWitnessRequest();

  const cancelTransaction = useCallback(() => {
    disallowSignTx(true);
  }, [disallowSignTx]);

  useOnUnload(cancelTransaction);

  useEffect(() => {
    (async () => {
      const emptyFn = (): void => void 0;
      if (!txWitnessRequest) return emptyFn;

      try {
        setDappInfo(await senderToDappInfo(txWitnessRequest.signContext.sender));
      } catch (error) {
        logger.error(error);
        void disallowSignTx(true, 'Could not get DApp info');
        redirectToDappTxSignFailure();
        return emptyFn;
      }

      setSignTxRequest(txWitnessRequest);

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
        { logger, runtime }
      );

      return () => {
        api.shutdown();
      };
    })();
  }, [setSignTxRequest, setDappInfo, txWitnessRequest, redirectToDappTxSignFailure, disallowSignTx]);

  const onCancelTransaction = () => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionSummaryCancelClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });
    disallowSignTx(true);
  };

  return (
    <Layout layoutClassname={cn(confirmTransactionError && styles.layoutError)} pageClassname={styles.spaceBetween}>
      {req && walletInfo && inMemoryWallet ? <DappTransactionContainer /> : <Skeleton loading />}
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
