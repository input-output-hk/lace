import React from 'react';
import { Button } from '@lace/common';
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

const dappDataApi = consumeRemoteApi<Pick<DappDataService, 'getSignTxData'>>(
  {
    baseChannel: DAPP_CHANNELS.dappData,
    properties: {
      getSignTxData: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  { logger: console, runtime }
);

export const ConfirmTransaction = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setNextView }
  } = useViewsFlowContext();
  const { getKeyAgentType } = useWalletStore();
  const { signTxData, errorMessage } = useSignTxData(dappDataApi.getSignTxData);
  const keyAgentType = getKeyAgentType();
  const isUsingHardwareWallet = keyAgentType !== Wallet.KeyManagement.KeyAgentType.InMemory;
  const disallowSignTx = useDisallowSignTx();
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet();
  const txType = signTxData ? getTxType(signTxData.tx) : undefined;
  const title = txType ? t(getTitleKey(txType)) : '';

  useOnBeforeUnload(disallowSignTx);

  return (
<<<<<<< Updated upstream
    <Layout pageClassname={styles.spaceBetween} title={title}>
      <ConfirmTransactionContent txType={txType} signTxData={signTxData} errorMessage={errorMessage} />
=======
    <Layout pageClassname={styles.spaceBetween} title={t(sectionTitle[DAPP_VIEWS.CONFIRM_TX])}>
      {isLoading && <Skeleton loading />}
      {!isLoading &&
        (isDRepRegistration ? (
          <ConfirmDRepRegistration
            dappInfo={signTxData.dappInfo}
            metadata={{
              depositPaid: 'depositPaid',
              drepId: 'drepId',
              hash: 'hash',
              url: 'url'
            }}
            translations={{
              metadata: t('core.drepRegistration.metadata'),
              labels: {
                depositPaid: t('core.drepRegistration.depositPaid'),
                drepId: t('core.drepRegistration.drepId'),
                hash: t('core.drepRegistration.hash'),
                url: t('core.drepRegistration.url')
              }
            }}
            errorMessage={errorMessage}
          />
        ) : (
          <DappTransaction
            transaction={txSummary}
            dappInfo={signTxData?.dappInfo}
            errorMessage={errorMessage}
            hasInsufficientFunds={hasInsufficientFunds}
            translations={{
              transaction: t('core.dappTransaction.transaction'),
              amount: t('core.dappTransaction.amount'),
              recipient: t('core.dappTransaction.recipient'),
              fee: t('core.dappTransaction.fee'),
              insufficientFunds: t('core.dappTransaction.insufficientFunds'),
              adaFollowingNumericValue: t('general.adaFollowingNumericValue')
            }}
          />
        ))}
>>>>>>> Stashed changes
      <div className={styles.actions}>
        <Button
          onClick={async () => {
            isUsingHardwareWallet ? signWithHardwareWallet() : setNextView();
          }}
          disabled={!!errorMessage}
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
    </Layout>
  );
};
