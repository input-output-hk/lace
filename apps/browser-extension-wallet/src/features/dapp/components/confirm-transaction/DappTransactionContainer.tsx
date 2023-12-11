import React from 'react';
import { useObservable } from '@lace/common';
import { useWalletStore } from '@stores';
import { useCreateAssetList, useCreateMintedAssetList, useTxSummary } from './hooks';
import { Skeleton } from 'antd';
import { DappTransaction } from '@lace/core';
import { TokenInfo } from '@src/utils/get-assets-information';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressListType } from '@src/views/browser-view/features/activity';
import { SignTxData } from './types';
import { useCurrencyStore } from '@providers/currency';
import { useFetchCoinPrice } from '@hooks';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const DappTransactionContainer = withAddressBookContext(
  ({ signTxData, errorMessage }: Props): React.ReactElement => {
    const {
      walletInfo,
      inMemoryWallet,
      blockchainProvider: { assetProvider },
      walletUI: { cardanoCoin }
    } = useWalletStore();
    const currencyStore = useCurrencyStore();
    const coinPrice = useFetchCoinPrice();
    const { list: addressList } = useAddressBookContext() as { list: AddressListType[] };
    const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);
    const createAssetList = useCreateAssetList({
      outputs: signTxData.tx.body.outputs,
      assets,
      assetProvider
    });
    const createMintedAssetList = useCreateMintedAssetList({
      metadata: signTxData.tx.auxiliaryData?.blob,
      outputs: signTxData.tx.body.outputs,
      mint: signTxData.tx.body.mint,
      assets,
      assetProvider
    });
    const txSummary = useTxSummary({
      addressList,
      createAssetList,
      createMintedAssetList,
      tx: signTxData.tx,
      walletInfo
    });

    if (!txSummary) {
      return <Skeleton />;
    }

    return (
      <DappTransaction
        transaction={txSummary}
        dappInfo={signTxData?.dappInfo}
        errorMessage={errorMessage}
        fiatCurrencyCode={currencyStore.fiatCurrency?.code}
        fiatCurrencyPrice={coinPrice.priceResult?.cardano?.price}
        coinSymbol={cardanoCoin.symbol}
      />
    );
  }
);
