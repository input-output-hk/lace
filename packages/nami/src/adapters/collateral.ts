import { useCallback, useMemo } from 'react';

import { useObservable } from '@lace/common';

import type { Wallet } from '@lace/cardano';

export const COLLATERAL_AMOUNT_LOVELACES = BigInt(5000);

interface Props {
  inMemoryWallet: Wallet.ObservableWallet;
  submitCollateralTx: () => Promise<void>;
  withSignTxConfirmation: (
    action: () => Promise<void>,
    password?: string,
  ) => Promise<void>;
}

export const useCollateral = ({
  inMemoryWallet,
  submitCollateralTx,
  withSignTxConfirmation,
}: Readonly<Props>) => {
  const unspendable = useObservable(inMemoryWallet.balance.utxo.unspendable$);
  const hasCollateral = useMemo(
    () => unspendable?.coins >= COLLATERAL_AMOUNT_LOVELACES,
    [unspendable?.coins],
  );
  const reclaimCollateral = useCallback(async () => {
    await inMemoryWallet.utxo.setUnspendable([]);
  }, [inMemoryWallet.utxo]);
  const submitCollateral = useCallback(
    async (password: string) =>
      withSignTxConfirmation(submitCollateralTx, password),
    [submitCollateralTx, withSignTxConfirmation],
  );

  return { hasCollateral, reclaimCollateral, submitCollateral };
};
