import React, { useEffect } from 'react';
import { useObservable } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { DappTransaction } from '@lace/core';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { useWalletStore } from '@stores';
import { AddressListType } from '@views/browser/features/activity';
import { Skeleton } from 'antd';
import { TokenInfo } from '@src/utils/get-assets-information';
import { useCreateAssetList, useTxSummary } from './hooks';
import { SignTxData } from './types';

export const SendContent = withAddressBookContext(
  ({
    signTxData,
    errorMessage,
    disableConfirmationBtn
  }: {
    signTxData: SignTxData;
    disableConfirmationBtn: (disable: boolean) => void;
    errorMessage?: string;
  }): React.ReactElement => {
    const { t } = useTranslation();
    const {
      walletInfo,
      inMemoryWallet,
      blockchainProvider: { assetProvider }
    } = useWalletStore();
    const { list: addressList } = useAddressBookContext() as { list: AddressListType[] };
    const tx = signTxData.tx;
    const outputs = tx.body.outputs;
    const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);
    const availableBalance = useObservable(inMemoryWallet.balance.utxo.available$);
    const createAssetList = useCreateAssetList({ outputs, assets, assetProvider });
    const { txSummary, hasInsufficientFunds } = useTxSummary({
      addressList,
      createAssetList,
      availableBalance,
      tx,
      walletInfo
    });

    useEffect(() => {
      disableConfirmationBtn(hasInsufficientFunds);
    }, [disableConfirmationBtn, hasInsufficientFunds]);

    const translations = {
      transaction: t('core.dappTransaction.transaction'),
      amount: t('core.dappTransaction.amount'),
      recipient: t('core.dappTransaction.recipient'),
      fee: t('core.dappTransaction.fee'),
      insufficientFunds: t('core.dappTransaction.insufficientFunds'),
      adaFollowingNumericValue: t('general.adaFollowingNumericValue')
    };

    return (
      <>
        {txSummary ? (
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
      </>
    );
  }
);
