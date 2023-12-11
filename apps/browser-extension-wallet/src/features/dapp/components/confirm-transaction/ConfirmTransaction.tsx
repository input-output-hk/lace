/* eslint-disable no-console */
import React, { useMemo, useState } from 'react';
import cn from 'classnames';
import { Button, PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Layout } from '../Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import styles from './ConfirmTransaction.module.scss';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@stores';
import { useDisallowSignTx, useSignWithHardwareWallet, useSignTxData, useOnBeforeUnload } from './hooks';
import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DappDataService } from '@lib/scripts/types';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { getTitleKey, getTxType } from './utils';
import { ConfirmTransactionContent } from './ConfirmTransactionContent';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { txSubmitted$ } from '@providers/AnalyticsProvider/onChain';
import { useAnalyticsContext } from '@providers';

export const ConfirmTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setNextView }
  } = useViewsFlowContext();
  const dappDataApi = useMemo(
    () =>
      consumeRemoteApi<Pick<DappDataService, 'getSignTxData'>>(
        {
          baseChannel: DAPP_CHANNELS.dappData,
          properties: {
            getSignTxData: RemoteApiPropertyType.MethodReturningPromise
          }
        },
        { logger: console, runtime }
      ),
    []
  );
  const { getKeyAgentType } = useWalletStore();
  const analytics = useAnalyticsContext();
  const { signTxData, errorMessage: getSignTxDataError } = useSignTxData(dappDataApi.getSignTxData);
  const [confirmTransactionError, setConfirmTransactionError] = useState(false);
  const keyAgentType = getKeyAgentType();
  const isUsingHardwareWallet = keyAgentType !== Wallet.KeyManagement.KeyAgentType.InMemory;
  const disallowSignTx = useDisallowSignTx();
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet();
  const txType = signTxData ? getTxType(signTxData.tx) : undefined;
  const title = txType ? t(getTitleKey(txType)) : '';
  const onConfirm = () => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionSummaryConfirmClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });

    txSubmitted$.next({
      id: signTxData.tx?.id.toString(),
      date: new Date().toString(),
      creationType: TxCreationType.External
    });

    isUsingHardwareWallet ? signWithHardwareWallet() : setNextView();
  };

  useOnBeforeUnload(disallowSignTx);

  return (
    <Layout
      layoutClassname={cn(confirmTransactionError && styles.layoutError)}
      pageClassname={styles.spaceBetween}
      title={!confirmTransactionError && title}
    >
      <ConfirmTransactionContent
        txType={txType}
        signTxData={signTxData}
        onError={() => setConfirmTransactionError(true)}
        errorMessage={getSignTxDataError}
      />
      {!confirmTransactionError && (
        <div className={styles.actions}>
          <Button
            onClick={onConfirm}
            disabled={!!getSignTxDataError}
            loading={isUsingHardwareWallet && isConfirmingTx}
            data-testid="dapp-transaction-confirm"
            className={styles.actionBtn}
          >
            {isUsingHardwareWallet
              ? t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: keyAgentType })
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
