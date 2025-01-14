import { Wallet } from '@lace/cardano';
import { useState, useEffect } from 'react';
import { Cardano, getCollateral } from '@cardano-sdk/core';
import { ObservableWalletState } from './useWalletState';

export const useComputeTxCollateral = (
  inputResolver: Cardano.InputResolver,
  wallet?: ObservableWalletState,
  tx?: Wallet.Cardano.Tx
): bigint | undefined => {
  const [txCollateral, setTxCollateral] = useState<bigint>();

  useEffect(() => {
    if (!tx || !wallet) return;

    const computeCollateral = async () => {
      const collateral = await getCollateral(
        tx,
        inputResolver,
        wallet.addresses.map((addr) => addr.address)
      );

      setTxCollateral(collateral);
    };

    computeCollateral();
  }, [tx, wallet, inputResolver]);

  return txCollateral;
};
