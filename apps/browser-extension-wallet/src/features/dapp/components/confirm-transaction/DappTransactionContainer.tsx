import React, { useState, useEffect, useMemo } from 'react';
import { logger, useObservable } from '@lace/common';
import {
  DappTransaction,
  TxDetailsCBOR,
  TxDetailsCertificates,
  TxDetailsProposalProcedures,
  TxDetailsVotingProcedures
} from '@lace/core';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';

import { Wallet } from '@lace/cardano';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { useWalletStore } from '@stores';
import { useFetchCoinPrice } from '@hooks';
import {
  createTxInspector,
  TransactionSummaryInspection,
  transactionSummaryInspector,
  Cardano,
  TokenTransferValue,
  tokenTransferInspector,
  Milliseconds
} from '@cardano-sdk/core';
import { createWalletAssetProvider } from '@cardano-sdk/wallet';
import { Skeleton } from 'antd';

import { useCurrencyStore } from '@providers';
import { walletRepository } from '@lib/wallet-api-ui';
import { useComputeTxCollateral } from '@hooks/useComputeTxCollateral';
import { eraSlotDateTime } from '@src/utils/era-slot-datetime';
import { AddressBookSchema, useDbStateValue } from '@lib/storage';
import { getAllWalletsAddresses } from '@src/utils/get-all-wallets-addresses';
import { useCexplorerBaseUrl } from './hooks';
import { getProviders } from '@stores/slices';

interface DappTransactionContainerProps {
  errorMessage?: string;
}

// eslint-disable-next-line no-magic-numbers
const TIMEOUT = 6000 as Milliseconds;

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
      walletState,
      currentChain
    } = useWalletStore();
    const explorerBaseUrl = useCexplorerBaseUrl();

    const ownAddresses = useObservable(inMemoryWallet.addresses$)?.map((a) => a.address);
    const { list: addressBook } = useAddressBookContext() as useDbStateValue<AddressBookSchema>;
    const addressToNameMap = new Map(addressBook?.map((entry) => [entry.address as string, entry.name]));

    const { fiatCurrency } = useCurrencyStore();
    const { priceResult } = useFetchCoinPrice();

    const [fromAddressTokens, setFromAddressTokens] = useState<
      Map<Cardano.PaymentAddress, TokenTransferValue> | undefined
    >();
    const [toAddressTokens, setToAddressTokens] = useState<
      Map<Cardano.PaymentAddress, TokenTransferValue> | undefined
    >();
    const [transactionInspectionDetails, setTransactionInspectionDetails] = useState<
      TransactionSummaryInspection | undefined
    >();

    const { inputResolver } = getProviders();

    const tx = useMemo(() => req?.transaction.toCore(), [req?.transaction]);
    const txCBOR = useMemo(() => req?.transaction.toCbor(), [req?.transaction]);

    const txCollateral = useComputeTxCollateral(inputResolver, walletState, tx);

    const userAddresses = useMemo(() => walletInfo.addresses.map((v) => v.address), [walletInfo.addresses]);
    const userRewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
    const rewardAccountsAddresses = useMemo(() => userRewardAccounts?.map((key) => key.address), [userRewardAccounts]);
    const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
    const eraSummaries = useObservable(inMemoryWallet?.eraSummaries$);
    const allWalletsAddresses = [...userAddresses, ...getAllWalletsAddresses(useObservable(walletRepository.wallets$))];

    useEffect(() => {
      if (!req || !protocolParameters) {
        setTransactionInspectionDetails(void 0);
        return;
      }
      const getTxSummary = async () => {
        const inspector = createTxInspector({
          tokenTransfer: tokenTransferInspector({
            inputResolver,
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
            }),
            timeout: TIMEOUT,
            logger
          }),
          summary: transactionSummaryInspector({
            addresses: userAddresses,
            rewardAccounts: rewardAccountsAddresses,
            inputResolver,
            protocolParameters,
            assetProvider: createWalletAssetProvider({
              assetProvider,
              assetInfo$: inMemoryWallet.assetInfo$,
              tx,
              logger
            }),
            timeout: TIMEOUT,
            logger
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
      inputResolver,
      protocolParameters,
      assetProvider,
      inMemoryWallet.assetInfo$,
      tx
    ]);

    return (
      <Flex flexDirection="column" justifyContent="space-between" alignItems="stretch">
        {req && transactionInspectionDetails && dappInfo ? (
          <>
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
              expiresBy={eraSlotDateTime(eraSummaries, tx.body.validityInterval?.invalidHereafter)}
              ownAddresses={allWalletsAddresses.length > 0 ? allWalletsAddresses : ownAddresses}
              addressToNameMap={addressToNameMap}
            />
            <TxDetailsCBOR cbor={txCBOR} />
            {tx?.body?.certificates?.length > 0 && (
              <TxDetailsCertificates
                cardanoCoin={cardanoCoin}
                certificates={tx.body.certificates}
                chainNetworkId={currentChain.networkId}
              />
            )}
            {tx?.body?.proposalProcedures?.length > 0 && (
              <TxDetailsProposalProcedures
                explorerBaseUrl={explorerBaseUrl}
                cardanoCoin={cardanoCoin}
                proposalProcedures={tx.body.proposalProcedures}
              />
            )}
            {tx?.body?.votingProcedures?.length > 0 && (
              <TxDetailsVotingProcedures
                explorerBaseUrl={explorerBaseUrl}
                votingProcedures={tx.body.votingProcedures}
                withSeparatorLine={false}
              />
            )}
          </>
        ) : (
          <Skeleton loading />
        )}
      </Flex>
    );
  }
);
