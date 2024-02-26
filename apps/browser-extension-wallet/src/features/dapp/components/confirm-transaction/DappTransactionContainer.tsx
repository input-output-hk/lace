import React from 'react';
import { useObservable } from '@lace/common';
import { useWalletStore } from '@stores';
import { useCreateAssetList, useCreateMintedAssetList, useTxSummary } from './hooks';
import { Skeleton } from 'antd';
import { DappTransaction } from '@lace/core';
import { TokenInfo } from '@src/utils/get-assets-information';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressListType } from '@src/views/browser-view/features/activity';
import { useCurrencyStore } from '@providers/currency';
import { useFetchCoinPrice } from '@hooks';
import { useViewsFlowContext } from '@providers';

interface Props {
  errorMessage?: string;
}

export const DappTransactionContainer = withAddressBookContext(({ errorMessage }: Props): React.ReactElement => {
  const {
    walletInfo,
    inMemoryWallet,
    blockchainProvider: { assetProvider },
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const currencyStore = useCurrencyStore();
  const coinPrice = useFetchCoinPrice();
  const { list: addressList } = useAddressBookContext() as { list: AddressListType[] };
  const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);

  const tx = request?.transaction.toCore();
  if (!tx) {
    return <Skeleton />;
  }
  const createAssetList = useCreateAssetList({
    outputs: tx.body.outputs,
    assets,
    assetProvider
  });
  const createMintedAssetList = useCreateMintedAssetList({
    metadata: tx.auxiliaryData?.blob,
    outputs: tx.body.outputs,
    mint: tx.body.mint,
    assets,
    assetProvider
  });
  const txSummary = useTxSummary({
    addressList,
    createAssetList,
    createMintedAssetList,
    req: request,
    walletInfo
  });

  return (
    <DappTransaction
      transaction={txSummary}
      dappInfo={dappInfo}
      errorMessage={errorMessage}
      fiatCurrencyCode={currencyStore.fiatCurrency?.code}
      fiatCurrencyPrice={coinPrice.priceResult?.cardano?.price}
      coinSymbol={cardanoCoin.symbol}
    />
  );
});
