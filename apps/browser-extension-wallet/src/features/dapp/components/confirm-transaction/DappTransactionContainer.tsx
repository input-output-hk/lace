import React from 'react';
import { useObservable } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@stores';
import { useCreateAssetList, useTxSummary } from './hooks';
import { Skeleton } from 'antd';
import { DappTransaction } from '@lace/core';
import { TokenInfo } from '@src/utils/get-assets-information';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressListType } from '@src/views/browser-view/features/activity';
import { SignTxData } from './types';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const DappTransactionContainer = withAddressBookContext(
  ({ signTxData, errorMessage }: Props): React.ReactElement => {
    const { t } = useTranslation();
    const {
      walletInfo,
      inMemoryWallet,
      blockchainProvider: { assetProvider }
    } = useWalletStore();
    const { list: addressList } = useAddressBookContext() as { list: AddressListType[] };
    const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);
    const createAssetList = useCreateAssetList({
      outputs: signTxData.tx.body.outputs,
      assets,
      assetProvider
    });
    const txSummary = useTxSummary({
      addressList,
      createAssetList,
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
        translations={{
          transaction: t('core.dappTransaction.transaction'),
          amount: t('core.dappTransaction.amount'),
          recipient: t('core.dappTransaction.recipient'),
          fee: t('core.dappTransaction.fee'),
          insufficientFunds: t('core.dappTransaction.insufficientFunds'),
          adaFollowingNumericValue: t('general.adaFollowingNumericValue')
        }}
      />
    );
  }
);
