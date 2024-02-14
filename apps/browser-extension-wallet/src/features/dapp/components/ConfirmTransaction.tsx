import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, PostHogAction, useObservable } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { DappTransaction } from '@lace/core';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';

import styles from './ConfirmTransaction.module.scss';
import { Wallet } from '@lace/cardano';
import { withAddressBookContext } from '@src/features/address-book/context';
import { useWalletStore } from '@stores';
import { exposeApi, RemoteApiPropertyType, WalletType } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { useFetchCoinPrice, useRedirection, useChainHistoryProvider } from '@hooks';
import {
  createTxInspector,
  TransactionSummaryInspection,
  transactionSummaryInspector,
  Cardano,
  TokenTransferValue,
  tokenTransferInspector
} from '@cardano-sdk/core';
import { createWalletAssetProvider } from '@cardano-sdk/wallet';
import { Skeleton } from 'antd';
import { dAppRoutePaths } from '@routes';
import type { UserPromptService } from '@lib/scripts/background/services';
import { of, take } from 'rxjs';

import { useCurrencyStore, useAnalyticsContext, useAppSettingsContext } from '@providers';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { txSubmitted$ } from '@providers/AnalyticsProvider/onChain';
import { logger, signingCoordinator } from '@lib/wallet-api-ui';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';
import { combinedInputResolver } from '@src/utils/combined-input-resolvers';

const DAPP_TOAST_DURATION = 50;

export const ConfirmTransaction = withAddressBookContext((): React.ReactElement => {
  const {
    utils: { setNextView },
    signTxRequest: { request: req, set: setSignTxRequest }
  } = useViewsFlowContext();
  const { t } = useTranslation();
  const {
    walletInfo,
    inMemoryWallet,
    walletType,
    isHardwareWallet,
    blockchainProvider: { assetProvider },
    walletUI: { cardanoCoin },
    fetchNetworkInfo
  } = useWalletStore();

  const { fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const analytics = useAnalyticsContext();
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();
  const [{ chainName }] = useAppSettingsContext();

  const [fromAddressTokens, setFromAddressTokens] = useState<
    Map<Cardano.PaymentAddress, TokenTransferValue> | undefined
  >();
  const [toAddressTokens, setToAddressTokens] = useState<Map<Cardano.PaymentAddress, TokenTransferValue> | undefined>();
  const [transactionInspectionDetails, setTransactionInspectionDetails] = useState<
    TransactionSummaryInspection | undefined
  >();

  const newChainHistoryProvider = useChainHistoryProvider({ chainName });

  const txInputResolver = useMemo(
    () => combinedInputResolver({ utxo: inMemoryWallet.utxo, chainHistoryProvider: newChainHistoryProvider }),
    [inMemoryWallet, newChainHistoryProvider]
  );

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  const cancelTransaction = useCallback(
    async (close = false) => {
      await req.reject('User rejected to sign');
      close && setTimeout(() => window.close(), DAPP_TOAST_DURATION);
    },
    [req]
  );

  window.addEventListener('beforeunload', cancelTransaction);

  const signWithHardwareWallet = async () => {
    setIsConfirmingTx(true);
    try {
      if (req.walletType !== WalletType.Ledger && req.walletType !== WalletType.Trezor) {
        throw new Error('Invalid state: expected hw wallet');
      }
      await req.sign();
      redirectToSignSuccess();
    } catch (error) {
      console.error('signWithHardwareWallet error', error);
      cancelTransaction(false);
      redirectToSignFailure();
    }
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
  }, [setSignTxRequest]);

  const userAddresses = useMemo(() => walletInfo.addresses.map((v) => v.address), [walletInfo.addresses]);
  const userRewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const rewardAccountsAddresses = useMemo(
    () => userRewardAccounts && userRewardAccounts.map((key) => key.address),
    [userRewardAccounts]
  );
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);

  useEffect(() => {
    if (!req) {
      setTransactionInspectionDetails(void 0);
      return;
    }

    const tx = req.transaction.toCore();

    const getTxSummary = async () => {
      const inspector = createTxInspector({
        tokenTransfer: tokenTransferInspector({
          inputResolver: txInputResolver,
          fromAddressAssetProvider: createWalletAssetProvider({
            assetProvider,
            assetInfo$: inMemoryWallet.assetInfo$,
            logger
          }),
          toAddressAssetProvider: createWalletAssetProvider({
            assetProvider,
            assetInfo$: inMemoryWallet.assetInfo$,
            tx,
            logger
          })
        }),
        summary: transactionSummaryInspector({
          addresses: userAddresses,
          rewardAccounts: rewardAccountsAddresses,
          inputResolver: txInputResolver,
          protocolParameters,
          assetProvider
        })
      });

      const { summary, tokenTransfer } = await inspector(tx as Wallet.Cardano.HydratedTx);

      const { toAddress, fromAddress } = tokenTransfer;
      setToAddressTokens(toAddress);
      setFromAddressTokens(fromAddress);
      setTransactionInspectionDetails(summary);
    };
    getTxSummary();
  }, [
    req,
    walletInfo.addresses,
    userAddresses,
    rewardAccountsAddresses,
    txInputResolver,
    protocolParameters,
    assetProvider,
    inMemoryWallet.assetInfo$
  ]);

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

  return (
    <div data-testid="layout-title" className={styles.transactionContainer}>
      {req && transactionInspectionDetails ? (
        <DappTransaction
          fiatCurrencyCode={fiatCurrency?.code}
          fiatCurrencyPrice={priceResult?.cardano?.price}
          coinSymbol={cardanoCoin.symbol}
          txInspectionDetails={transactionInspectionDetails}
          dappInfo={dappInfo}
          fromAddress={fromAddressTokens}
          toAddress={toAddressTokens}
        />
      ) : (
        <Skeleton loading />
      )}
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
          onClick={cancelTransaction}
          className={styles.actionBtn}
        >
          {t('dapp.confirm.btn.cancel')}
        </Button>
      </div>
    </div>
  );
});
