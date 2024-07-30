import React, { useState, useEffect, useMemo } from 'react';
import { useObservable } from '@lace/common';
import {
  DappTransaction,
  TxDetailsCertificates,
  TxDetailsProposalProcedures,
  TxDetailsVotingProcedures
} from '@lace/core';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
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
  tokenTransferInspector,
  Milliseconds
} from '@cardano-sdk/core';
import { createWalletAssetProvider } from '@cardano-sdk/wallet';
import { Skeleton } from 'antd';

import { useCurrencyStore, useAppSettingsContext } from '@providers';
import { logger, walletRepository } from '@lib/wallet-api-ui';
import { useComputeTxCollateral } from '@hooks/useComputeTxCollateral';
import { utxoAndBackendChainHistoryResolver } from '@src/utils/utxo-chain-history-resolver';
import { eraSlotDateTime } from '@src/utils/era-slot-datetime';
import { AddressBookSchema, useDbStateValue } from '@lib/storage';
import { getAllWalletsAddresses } from '@src/utils/get-all-wallets-addresses';
import { useCexplorerBaseUrl, useDisallowSignTx } from './hooks';
import { NonRegisteredUserModal } from './NonRegisteredUserModal/NonRegisteredUserModal';

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
    const [isNonRegisteredUserModalVisible, setIsNonRegisteredUserModalVisible] = useState<boolean>(false);
    const [userAckNonRegisteredState, setUserAckNonRegisteredState] = useState<boolean>(false);
    const disallowSignTx = useDisallowSignTx(req);
    const explorerBaseUrl = useCexplorerBaseUrl();

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

    useEffect(() => {
      if (userAckNonRegisteredState || !tx?.body?.votingProcedures) return () => void 0;
      const subscription = inMemoryWallet?.governance?.isRegisteredAsDRep$?.subscribe(
        (hasValidDrepRegistration): void => {
          setIsNonRegisteredUserModalVisible(!hasValidDrepRegistration);
        }
      );

      return () => subscription?.unsubscribe();
    }, [inMemoryWallet?.governance?.isRegisteredAsDRep$, userAckNonRegisteredState, tx]);

    const txCollateral = useComputeTxCollateral(walletState, tx);

    const userAddresses = useMemo(() => walletInfo.addresses.map((v) => v.address), [walletInfo.addresses]);
    const userRewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
    const rewardAccountsAddresses = useMemo(() => userRewardAccounts?.map((key) => key.address), [userRewardAccounts]);
    const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
    const eraSummaries = useObservable(inMemoryWallet?.eraSummaries$);
    const allWalletsAddresses = getAllWalletsAddresses(useObservable(walletRepository.wallets$));

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
            }),
            timeout: TIMEOUT,
            logger: console
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
            }),
            timeout: TIMEOUT,
            logger: console
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
        <NonRegisteredUserModal
          visible={isNonRegisteredUserModalVisible}
          onConfirm={() => {
            setUserAckNonRegisteredState(true);
            setIsNonRegisteredUserModalVisible(false);
          }}
          onClose={() => disallowSignTx(true)}
        />
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
