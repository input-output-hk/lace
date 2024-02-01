import { Wallet } from '@lace/cardano';
import { createHistoricalOwnInputResolver } from '@src/utils/own-input-resolver';
import { useState, useEffect } from 'react';
import { firstValueFrom } from 'rxjs';
import { getCollateral } from '@cardano-sdk/core';

export const useComputeTxCollateral = (wallet: Wallet.ObservableWallet, tx?: Wallet.Cardano.Tx): bigint | undefined => {
  const [txCollateral, setTxCollateral] = useState<bigint>();

  useEffect(() => {
    if (!tx) return;

    const computeCollateral = async () => {
      const addresses = await firstValueFrom(wallet.addresses$);

      const inputResolver = createHistoricalOwnInputResolver({
        addresses$: wallet.addresses$,
        transactionsHistory$: wallet.transactions.history$
      });

      const collateral = await getCollateral(
        tx,
        inputResolver,
        addresses.map((addr) => addr.address)
      );

      setTxCollateral(collateral);
    };

    computeCollateral();
  }, [tx?.id, wallet]);

  return txCollateral;
};
