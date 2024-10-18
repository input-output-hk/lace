import { useCallback, useMemo } from 'react';

import { isNotNil } from '@cardano-sdk/util';
import { useObservable } from '@lace/common';
import { firstValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

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

export const getCollateralUtxo = async (
  txId: Readonly<Wallet.Cardano.TransactionId>,
  inMemoryWallet: Wallet.ObservableWallet,
): Promise<Wallet.Cardano.Utxo> => {
  return await firstValueFrom(
    inMemoryWallet.utxo.available$.pipe(
      map(utxos =>
        utxos.find(
          o => o[0].txId === txId && o[1].value.coins === BigInt('5000000'),
        ),
      ),
      filter(isNotNil),
      take(1),
    ),
  );
};
