import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import {
  ActivityStatus,
  OutputSummaryProps,
  SharedWalletTransactionDetails,
  CoSignersListItem,
  SignPolicy
} from '@lace/core';
import { useWalletStore } from '@stores';
import { useCurrencyStore } from '@providers';
import { Wallet } from '@lace/cardano';
import { useFetchCoinPrice, useSharedWalletData } from '@hooks';

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
  const { sharedWalletKey, getSignPolicy, coSigners } = useSharedWalletData();
  const [signPolicy, setSignPolicy] = useState<SignPolicy>();

  useEffect(() => {
    (async () => {
      const policy = await getSignPolicy('payment');
      setSignPolicy(policy);
    })();
  }, [getSignPolicy]);

  const amountTransformer = (ada: string) =>
    `${Wallet.util.convertAdaToFiat({ ada, fiat: priceResult?.cardano?.price })} ${fiatCurrency?.code}`;

  const transactionCosigners = useMemo(
    (): CoSignersListItem[] =>
      coSigners?.map((signer) => ({
        ...signer,
        signed: false
      })) || [],
    [coSigners]
  );

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
