/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import { Skeleton } from 'antd';
import { config } from '@src/config';
import { Wallet } from '@lace/cardano';
import {
  AssetActivityListProps,
  TransactionDetailBrowser,
  TransactionStatus,
  TxOutputInput,
  TxSummary
} from '@lace/core';
import { PriceResult } from '@hooks';
import { useWalletStore } from '@stores';
import { TransactionDetail as TransactionDetailType } from '@src/types';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { useCurrencyStore, useExternalLinkOpener } from '@providers';

const MAX_SUMMARY_ADDRESSES = 5;

export type AddressListType = {
  id: number;
  name: string;
  address: string;
};

export const getTransactionData = ({
  addrOutputs,
  addrInputs,
  walletAddresses,
  isIncomingTransaction
}: {
  addrOutputs: TxOutputInput[];
  addrInputs: TxOutputInput[];
  walletAddresses: string[];
  isIncomingTransaction: boolean;
}): TxSummary[] => {
  if (!addrOutputs || !addrInputs || !walletAddresses) {
    return [];
  }

  // For incomming type of tx the sender addresses will be all addresses available in transactionInfo?.tx.addrInputs list (except the current one)
  if (isIncomingTransaction) {
    const outputData = addrOutputs.filter((input) => walletAddresses.includes(input.addr));
    const addrs = uniq(
      flatMap(addrInputs, (input) => (!walletAddresses.includes(input.addr) ? [input.addr] : []))
    ) as string[];

    return outputData.map((output) => ({
      ...output,
      // Show up to 5 addresses below multiple addresses (see LW-4040)
      addr: addrs.slice(0, MAX_SUMMARY_ADDRESSES)
    }));
  }

  // For outgoing/sent type of tx the receiver addresses will be all addresses available in transactionInfo?.tx.addrOutputs list (except the current one)
  return addrOutputs
    .filter((output) => !walletAddresses.includes(output.addr))
    .map((output) => ({
      ...output,
      ...(!Array.isArray(output.addr) && { addr: [output.addr] })
    }));
};

const getCurrentTransactionStatus = (
  activities: AssetActivityListProps[],
  txId: Wallet.Cardano.TransactionId
): TransactionStatus => {
  const todayActivity = activities.find((activity) => activity.title === 'Today');
  const transaction = todayActivity?.items.find((item) => item.id === String(txId));
  return transaction?.status;
};

interface TransactionDetailProps {
  price: PriceResult;
}

export const TransactionDetail = withAddressBookContext<TransactionDetailProps>(({ price }): ReactElement => {
  const {
    walletInfo,
    walletUI: { cardanoCoin, appMode },
    environmentName
  } = useWalletStore();
  const isPopupView = appMode === APP_MODE_POPUP;
  const { getTransactionDetails, transactionDetail, fetchingTransactionInfo, walletActivities } = useWalletStore();
  const [transactionInfo, setTransactionInfo] = useState<TransactionDetailType>();
  const { fiatCurrency } = useCurrencyStore();
  const { list: addressList } = useAddressBookContext();
  const { CEXPLORER_BASE_URL } = config();
  const openExternalLink = useExternalLinkOpener();

  const explorerBaseUrl = useMemo(() => CEXPLORER_BASE_URL[environmentName], [CEXPLORER_BASE_URL, environmentName]);

  const currentTransactionStatus = useMemo(
    () => getCurrentTransactionStatus(walletActivities, transactionDetail.tx.id) || transactionInfo?.status,
    [transactionDetail.tx.id, transactionInfo?.status, walletActivities]
  );

  const fetchTransactionInfo = useCallback(async () => {
    const result = await getTransactionDetails({ coinPrices: price, fiatCurrency });
    setTransactionInfo(result);
  }, [getTransactionDetails, setTransactionInfo, price, fiatCurrency]);

  useEffect(() => {
    fetchTransactionInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addressToNameMap = useMemo(
    () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
    [addressList]
  );

  const isIncomingTransaction = transactionDetail.direction === 'Incoming';
  const { addrOutputs, addrInputs } = transactionInfo?.tx || {};
  const txSummary = useMemo(
    () =>
      getTransactionData({
        addrOutputs,
        addrInputs,
        walletAddresses: walletInfo.addresses.map((addr) => addr.address.toString()),
        isIncomingTransaction
      }),
    [isIncomingTransaction, addrOutputs, addrInputs, walletInfo.addresses]
  );

  if (fetchingTransactionInfo || !transactionInfo) return <Skeleton data-testid="transaction-details-skeleton" />;

  const getHeaderDescription = () => {
    if (transactionInfo.type === 'rewards') return '';
    if (transactionInfo.type === 'delegation') return '1 token';
    return ` (${transactionInfo?.assetAmount})`;
  };

  const handleOpenExternalLink = () => {
    const externalLink = `${explorerBaseUrl}/${transactionInfo.tx.hash}`;
    externalLink && currentTransactionStatus === 'success' && openExternalLink(externalLink);
  };

  return (
    <TransactionDetailBrowser
      hash={transactionInfo.tx.hash}
      status={currentTransactionStatus}
      includedDate={transactionInfo.tx.includedDate}
      includedTime={transactionInfo.tx.includedTime}
      addrInputs={transactionInfo.tx.addrInputs}
      addrOutputs={transactionInfo.tx.addrOutputs}
      fee={transactionInfo.tx.fee}
      poolName={transactionInfo.tx?.poolName}
      poolTicker={transactionInfo.tx?.poolTicker}
      poolId={transactionInfo.tx?.poolId}
      deposit={transactionInfo.tx.deposit}
      metadata={transactionInfo.tx.metadata}
      amountTransformer={(ada: string) =>
        `${Wallet.util.convertAdaToFiat({ ada, fiat: price?.cardano?.price })} ${fiatCurrency?.code}`
      }
      headerDescription={getHeaderDescription() || cardanoCoin.symbol}
      txSummary={txSummary}
      addressToNameMap={addressToNameMap}
      coinSymbol={cardanoCoin.symbol}
      rewards={transactionInfo.tx?.rewards}
      type={transactionInfo?.type}
      isPopupView={isPopupView}
      openExternalLink={handleOpenExternalLink}
    />
  );
});
