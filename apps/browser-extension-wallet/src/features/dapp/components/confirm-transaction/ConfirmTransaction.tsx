import React, { useMemo } from 'react';
import { Button, useObservable } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { DappTransaction } from '@lace/core';
import { Layout } from '../Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { sectionTitle, DAPP_VIEWS } from '../../config';
import styles from './ConfirmTransaction.module.scss';
import { Wallet } from '@lace/cardano';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { useWalletStore } from '@stores';
import { AddressListType } from '@views/browser/features/activity';
import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DappDataService } from '@lib/scripts/types';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { Skeleton } from 'antd';
import { TokenInfo } from '@src/utils/get-assets-information';
import { useCreateAssetList, useDisallowSignTx, useSignTxData, useSignWithHardwareWallet, useTxSummary } from './hooks';

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
  const {
    utils: { setNextView }
  } = useViewsFlowContext();
  const { t } = useTranslation();
  const {
    walletInfo,
    inMemoryWallet,
    getKeyAgentType,
    blockchainProvider: { assetProvider }
  } = useWalletStore();
  const { list: addressList } = useAddressBookContext() as { list: AddressListType[] };
  const { signTxData, errorMessage } = useSignTxData(dappDataApi.getSignTxData);
  const tx = signTxData?.tx;
  const outputs = tx?.body?.outputs;
  const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);
  const availableBalance = useObservable(inMemoryWallet.balance.utxo.available$);
  const keyAgentType = getKeyAgentType();
  const isUsingHardwareWallet = useMemo(
    () => keyAgentType !== Wallet.KeyManagement.KeyAgentType.InMemory,
    [keyAgentType]
  );
  const disallowSignTx = useDisallowSignTx();
  const { isConfirmingTx, signWithHardwareWallet } = useSignWithHardwareWallet();
  const createAssetList = useCreateAssetList({ outputs, assets, assetProvider });
  const { txSummary, hasInsufficientFunds } = useTxSummary({
    addressList,
    createAssetList,
    availableBalance,
    tx,
    walletInfo
  });

  const translations = {
    transaction: t('core.dappTransaction.transaction'),
    amount: t('core.dappTransaction.amount'),
    recipient: t('core.dappTransaction.recipient'),
    fee: t('core.dappTransaction.fee'),
    insufficientFunds: t('core.dappTransaction.insufficientFunds'),
    adaFollowingNumericValue: t('general.adaFollowingNumericValue')
  };
  window.addEventListener('beforeunload', cancelTransaction);

  return (
    <Layout pageClassname={styles.spaceBetween} title={t(sectionTitle[DAPP_VIEWS.CONFIRM_TX])}>
      {tx && txSummary ? (
        <DappTransaction
          transaction={txSummary}
          dappInfo={signTxData?.dappInfo}
          errorMessage={errorMessage}
          translations={translations}
          hasInsufficientFunds={hasInsufficientFunds}
        />
      ) : (
        <Skeleton loading />
      )}
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
