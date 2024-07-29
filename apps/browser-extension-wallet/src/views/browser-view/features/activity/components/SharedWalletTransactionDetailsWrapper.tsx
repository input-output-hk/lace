import {
  ActivityStatus,
  CoSignersListItem,
  exportMultisigTransaction,
  hasSigned,
  SharedWalletTransactionDetails,
  SignPolicy,
  TxSummary
} from '@lace/core';
import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import { useWalletStore } from '@stores';
import { Wallet } from '@lace/cardano';
import { useSharedWalletData } from '@hooks';
import { AddressListType, getTransactionData } from '@views/browser/features/activity';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { TransactionActivityDetail, TxDirection, TxDirections } from '@types';
import { Serialization } from '@cardano-sdk/core';

interface SharedWalletTransactionDetailsProxyProps {
  amountTransformer: (amount: string) => string;
  activityInfo: TransactionActivityDetail;
  direction: TxDirection;
}

const formatRows = ({
  txSummary,
  amountTransformer,
  cardanoCoin,
  addressToNameMap
}: {
  txSummary: TxSummary[];
  amountTransformer: (amount: string) => string;
  cardanoCoin: Wallet.CoinId;
  addressToNameMap: Map<string, string>;
}) =>
  txSummary.map(({ amount, assetList, addr }) => {
    const coins = { assetAmount: `${amount} ${cardanoCoin.symbol}`, fiatAmount: amountTransformer(amount) };
    const assets = assetList.map(({ amount: assetAmount, fiatBalance }) => ({
      assetAmount,
      fiatAmount: fiatBalance
    }));
    return {
      list: [coins, ...assets],
      recipientAddress: addr[0],
      recipientName: addressToNameMap.get(addr[0])
    };
  });

export const SharedWalletTransactionDetailsWrapper = withAddressBookContext(
  ({ amountTransformer, activityInfo, direction }: SharedWalletTransactionDetailsProxyProps): ReactElement => {
    const {
      walletUI: { cardanoCoin },
      walletInfo,
      activityDetail,
      currentChain
    } = useWalletStore();
    const { sharedWalletKey, getSignPolicy, coSigners } = useSharedWalletData();
    const [signPolicy, setSignPolicy] = useState<SignPolicy>();
    const [transactionCosigners, setTransactionCosigners] = useState<CoSignersListItem[]>([]);
    const { list: addressList } = useAddressBookContext();

    useEffect(() => {
      (async () => {
        const policy = await getSignPolicy('payment');
        setSignPolicy(policy);

        const signatures = (activityDetail.activity as Wallet.Cardano.Tx).witness.signatures;
        const cosignersWithSignStatus = await Promise.all(
          coSigners.map(async (signer) => ({
            ...signer,
            signed: await hasSigned(signer.sharedWalletKey, 'payment', signatures)
          }))
        );
        setTransactionCosigners(cosignersWithSignStatus);
      })();
    }, [activityDetail.activity, coSigners, getSignPolicy, sharedWalletKey]);

    const addressToNameMap = useMemo(
      () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
      [addressList]
    );

    const { addrOutputs, addrInputs, fee } = activityInfo.activity;

    const txSummary = useMemo(
      () =>
        getTransactionData({
          addrOutputs,
          addrInputs,
          walletAddresses: walletInfo.addresses.map((addr) => addr.address.toString()),
          isIncomingTransaction: direction === TxDirections.Incoming
        }),
      [addrOutputs, addrInputs, walletInfo.addresses, direction]
    );

    const rows = useMemo(
      () => formatRows({ txSummary, amountTransformer, cardanoCoin, addressToNameMap }),
      [addressToNameMap, amountTransformer, cardanoCoin, txSummary]
    );

    const onExportTransaction = async () => {
      const cbor = Serialization.Transaction.fromCore(activityDetail.activity as Wallet.Cardano.Tx).toCbor();
      await exportMultisigTransaction(cbor, sharedWalletKey, currentChain);
    };

    return (
      <SharedWalletTransactionDetails
        amountTransformer={amountTransformer}
        coinSymbol={cardanoCoin.symbol}
        cosigners={transactionCosigners}
        fee={fee}
        ownSharedKey={sharedWalletKey}
        rows={rows}
        signPolicy={{
          requiredCosigners: signPolicy?.requiredCosigners,
          signers: signPolicy?.signers || []
        }}
        status={ActivityStatus.AWAITING_COSIGNATURES}
        txInitiator={sharedWalletKey}
        onExportTransaction={onExportTransaction}
      />
    );
  }
);
