import React, { useState, useEffect, useMemo } from 'react';
import { useObservable } from '@lace/common';
import { DappTransaction } from '@lace/core';
import { Flex } from '@lace/ui';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';

import { Wallet } from '@lace/cardano';
import { withAddressBookContext } from '@src/features/address-book/context';
import { useWalletStore } from '@stores';
import { exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { useFetchCoinPrice, useChainHistoryProvider } from '@hooks';
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
import type { UserPromptService } from '@lib/scripts/background/services';
import { of, take } from 'rxjs';

import { useCurrencyStore, useAppSettingsContext } from '@providers';
import { logger, signingCoordinator } from '@lib/wallet-api-ui';
import { useComputeTxCollateral } from '@hooks/useComputeTxCollateral';
import { utxoAndBackendChainHistoryResolver } from '@src/utils/utxo-chain-history-resolver';

interface DappTransactionContainerProps {
  errorMessage?: string;
}

export const DappTransactionContainer = withAddressBookContext(
  ({ errorMessage }: DappTransactionContainerProps): React.ReactElement => {
    const {
      signTxRequest: { request: req, set: setSignTxRequest },
      dappInfo
    } = useViewsFlowContext();
    const {
      walletInfo,
      inMemoryWallet,
      blockchainProvider: { assetProvider },
      walletUI: { cardanoCoin },
      fetchNetworkInfo,
      walletState
    } = useWalletStore();

    const { fiatCurrency } = useCurrencyStore();
    const { priceResult } = useFetchCoinPrice();

    const [{ chainName }] = useAppSettingsContext();

    const [fromAddressTokens, setFromAddressTokens] = useState<
      Map<Cardano.PaymentAddress, TokenTransferValue> | undefined
    >();
    const [toAddressTokens, setToAddressTokens] = useState<
      Map<Cardano.PaymentAddress, TokenTransferValue> | undefined
    >();
    const [transactionInspectionDetails, setTransactionInspectionDetails] = useState<
      TransactionSummaryInspection | undefined
    >();

    const chainHistoryProvider = useChainHistoryProvider({ chainName });

    const txInputResolver = useMemo(
      () => utxoAndBackendChainHistoryResolver({ utxo: inMemoryWallet.utxo, chainHistoryProvider }),
      [inMemoryWallet, chainHistoryProvider]
    );

    const tx = useMemo(() => req?.transaction.toCore(), [req?.transaction]);
    const txCollateral = useComputeTxCollateral(walletState, tx);

    useEffect(() => {
      fetchNetworkInfo();
    }, [fetchNetworkInfo]);

    useEffect(() => {
      const subscription = signingCoordinator.transactionWitnessRequest$.pipe(take(1)).subscribe(async (r) => {
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
            assetProvider: createWalletAssetProvider({
              assetProvider,
              assetInfo$: inMemoryWallet.assetInfo$,
              tx,
              logger
            })
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
      inMemoryWallet.assetInfo$,
      tx
    ]);

    return (
      <Flex flexDirection="column" justifyContent="space-between" alignItems="stretch">
        {req && transactionInspectionDetails && dappInfo ? (
          <DappTransaction
            fiatCurrencyCode={fiatCurrency?.code}
            fiatCurrencyPrice={priceResult?.cardano?.price}
            coinSymbol={cardanoCoin.symbol}
            txInspectionDetails={transactionInspectionDetails}
            dappInfo={dappInfo}
            fromAddress={fromAddressTokens}
            errorMessage={errorMessage}
            toAddress={toAddressTokens}
            collateral={Wallet.util.lovelacesToAdaString(txCollateral.toString())}
          />
        ) : (
          <Skeleton loading />
        )}
      </Flex>
    );
  }
);
