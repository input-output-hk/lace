import React, { useState, useEffect, useMemo } from 'react';
import { useObservable } from '@lace/common';
import { DappTransaction } from '@lace/core';
import { Flex } from '@lace/ui';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';

import { Wallet } from '@lace/cardano';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { useWalletStore } from '@stores';
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

import { useCurrencyStore, useAppSettingsContext } from '@providers';
import { logger } from '@lib/wallet-api-ui';
import { useComputeTxCollateral } from '@hooks/useComputeTxCollateral';
import { utxoAndBackendChainHistoryResolver } from '@src/utils/utxo-chain-history-resolver';
import { AddressBookSchema, useDbStateValue } from '@lib/storage';

interface DappTransactionContainerProps {
  errorMessage?: string;
}

export const DappTransactionContainer = withAddressBookContext(
  ({ errorMessage }: DappTransactionContainerProps): React.ReactElement => {
    const {
      signTxRequest: { request: req },
      dappInfo
    } = useViewsFlowContext();

    const {
      walletInfo,
      inMemoryWallet,
      blockchainProvider: { assetProvider },
      walletUI: { cardanoCoin },
      walletState
    } = useWalletStore();

    const ownAddresses = useObservable(inMemoryWallet.addresses$)?.map((a) => a.address);
    const { list: addressBook } = useAddressBookContext() as useDbStateValue<AddressBookSchema>;
    const addressToNameMap = new Map(addressBook?.map((entry) => [entry.address as string, entry.name]));

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
      () =>
        utxoAndBackendChainHistoryResolver({
          utxo: inMemoryWallet.utxo,
          transactions: inMemoryWallet.transactions,
          chainHistoryProvider
        }),
      [inMemoryWallet, chainHistoryProvider]
    );

    const tx = useMemo(() => req?.transaction.toCore(), [req?.transaction]);
    const txCollateral = useComputeTxCollateral(walletState, tx);

    const userAddresses = useMemo(() => walletInfo.addresses.map((v) => v.address), [walletInfo.addresses]);
    const userRewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
    const rewardAccountsAddresses = useMemo(() => userRewardAccounts?.map((key) => key.address), [userRewardAccounts]);
    const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);

    useEffect(() => {
      if (!req || !protocolParameters) {
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
            collateral={txCollateral}
            ownAddresses={ownAddresses}
            addressToNameMap={addressToNameMap}
          />
        ) : (
          <Skeleton loading />
        )}
      </Flex>
    );
  }
);
