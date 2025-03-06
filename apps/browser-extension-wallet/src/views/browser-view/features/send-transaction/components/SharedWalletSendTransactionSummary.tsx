import React, { ReactElement, useEffect, useState } from 'react';
import {
  ActivityStatus,
  OutputSummaryProps,
  SharedWalletTransactionDetails,
  CoSignersListItem,
  hasSigned,
  useSharedWalletData,
  useSignPolicy
} from '@lace/core';
import { useWalletStore } from '@stores';
import { useCurrencyStore } from '@providers';
import { Wallet } from '@lace/cardano';
import { useCurrentWallet, useFetchCoinPrice } from '@hooks';
import { useBuiltTxState } from '@views/browser/features/send-transaction';

interface SharedWalletSendTransactionSummaryProps {
  rows: OutputSummaryProps[];
  fee: string;
}

const SharedWalletSendTransactionSummary = ({ rows, fee }: SharedWalletSendTransactionSummaryProps): ReactElement => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const { fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const wallet = useCurrentWallet();
  const { sharedWalletKey, coSigners } = useSharedWalletData(wallet);
  const signPolicy = useSignPolicy(wallet, 'payment');
  const { builtTxData } = useBuiltTxState();
  const [transactionCosigners, setTransactionCosigners] = useState<CoSignersListItem[]>([]);

  useEffect(() => {
    (async () => {
      let currentCoSigners: CoSignersListItem[];
      if (builtTxData.importedSharedWalletTx) {
        const signatures = builtTxData.importedSharedWalletTx.toCore().witness.signatures;
        currentCoSigners = await Promise.all(
          coSigners?.map(async (signer) => ({
            ...signer,
            signed: await hasSigned(signer.sharedWalletKey, 'payment', signatures)
          })) || []
        );
      } else {
        currentCoSigners =
          coSigners?.map((signer) => ({
            ...signer,
            signed: false
          })) || [];
      }
      setTransactionCosigners(currentCoSigners);
    })();
  }, [builtTxData.importedSharedWalletTx, coSigners]);

  const amountTransformer = (ada: string) =>
    `${Wallet.util.convertAdaToFiat({ ada, fiat: priceResult?.cardano?.price })} ${fiatCurrency?.code}`;

  return (
    <SharedWalletTransactionDetails
      fee={fee}
      coinSymbol={cardanoCoin.symbol}
      amountTransformer={amountTransformer}
      cosigners={transactionCosigners}
      ownSharedKey={sharedWalletKey}
      rows={rows}
      signPolicy={{
        requiredCosigners: signPolicy?.requiredCosigners,
        signers: signPolicy?.signers || []
      }}
      status={ActivityStatus.AWAITING_COSIGNATURES}
      txInitiator={sharedWalletKey}
    />
  );
};

export default SharedWalletSendTransactionSummary;
