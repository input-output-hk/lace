import { Wallet } from '@lace/cardano';
import { createHistoricalOwnInputResolver } from '@src/utils/own-input-resolver';
import { useState, useEffect } from 'react';
import { getCollateral } from '@cardano-sdk/core';
import { ObservableWalletState } from './useWalletState';

export const useComputeTxCollateral = (wallet?: ObservableWalletState, tx?: Wallet.Cardano.Tx): bigint | undefined => {
  const [txCollateral, setTxCollateral] = useState<bigint>();

  useEffect(() => {
    if (!tx || !wallet) return;

    const computeCollateral = async () => {
      const inputResolver = createHistoricalOwnInputResolver({
        addresses: wallet.addresses,
        transactions: wallet.transactions
      });

      const collateral = await getCollateral(
        tx,
        inputResolver,
        wallet.addresses.map((addr) => addr.address)
      );

      setTxCollateral(collateral);
    };

    computeCollateral();
  }, [tx, wallet]);

  return txCollateral;
};
