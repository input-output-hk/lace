import React from 'react';
import { Button, useObservable } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { Layout } from '../Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { sectionTitle, DAPP_VIEWS } from '../../config';
import styles from './ConfirmTransaction.module.scss';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@stores';
import { useDisallowSignTx, useSignWithHardwareWallet, useSignTxData, useCreateAssetList, useTxSummary } from './hooks';
import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DappDataService } from '@lib/scripts/types';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { Skeleton } from 'antd';
import { ConfirmDRepRegistration, DappTransaction } from '@lace/core';
import { TokenInfo } from '@src/utils/get-assets-information';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressListType } from '@src/views/browser-view/features/activity';

const dappDataApi = consumeRemoteApi<Pick<DappDataService, 'getSignTxData'>>(
  {
    baseChannel: DAPP_CHANNELS.dappData,
    properties: {
      getSignTxData: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  { logger: console, runtime }
);

export const ConfirmTransaction = withAddressBookContext((): React.ReactElement => {
  const { t } = useTranslation();
  const {
    utils: { setNextView }
  } = useViewsFlowContext();
  const {
    walletInfo,
    inMemoryWallet,
    blockchainProvider: { assetProvider },
    getKeyAgentType
  } = useWalletStore();
  const { list: addressList } = useAddressBookContext() as { list: AddressListType[] };
  const { signTxData, errorMessage } = useSignTxData(dappDataApi.getSignTxData);
  const tx = signTxData?.tx;
  const outputs = tx?.body.outputs;
  const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);
  const availableBalance = useObservable(inMemoryWallet.balance.utxo.available$);
  const createAssetList = useCreateAssetList({ outputs, assets, assetProvider });
  const keyAgentType = getKeyAgentType();
  const isUsingHardwareWallet = keyAgentType !== Wallet.KeyManagement.KeyAgentType.InMemory;
  const disallowSignTx = useDisallowSignTx();
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet();
  const { txSummary, hasInsufficientFunds } = useTxSummary({
    addressList,
    createAssetList,
    availableBalance,
    tx,
    walletInfo
  });
  const isLoading = !signTxData || !txSummary;
  const isDRepRegistration = true; // tx?.body.certificates.some(
  //  ({ __typename }) => __typename === Wallet.Cardano.CertificateType.RegisterDelegateRepresentative
  // );

  return (
    <Layout pageClassname={styles.spaceBetween} title={t(sectionTitle[DAPP_VIEWS.CONFIRM_TX])}>
      {isLoading && <Skeleton loading />}
      {!isLoading &&
        (isDRepRegistration ? (
          <ConfirmDRepRegistration
            dappInfo={signTxData.dappInfo}
            hasInsufficientFunds={hasInsufficientFunds}
            metadata={{
              depositPaid: 'depositPaid',
              drepId: 'drepId',
              hash: 'hash',
              url: 'url'
            }}
            translations={{
              insufficientFundsWarning: t('core.drepRegistration.insufficientFunds'),
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
      <div className={styles.actions}>
        <Button
          onClick={async () => {
            isUsingHardwareWallet ? signWithHardwareWallet() : setNextView();
          }}
          disabled={!!errorMessage || hasInsufficientFunds}
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
});
