import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useCallback, useMemo, useState } from 'react';
import { useObservable } from '@lace/common';
import { useMaxAda } from '@hooks/useMaxAda';
import { firstValueFrom } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';
import { isNotNil } from '@cardano-sdk/util';
import { useSyncingTheFirstTime } from './useSyncingTheFirstTime';
import { TxBuilder } from '@cardano-sdk/tx-construction';

const COLLATERAL_ADA_AMOUNT = 5;
export const COLLATERAL_AMOUNT_LOVELACES = BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT)));

type UseCollateralReturn = {
  initializeCollateralTx: () => Promise<void>;
  submitCollateralTx: () => Promise<void>;
  isInitializing: boolean;
  isSubmitting: boolean;
  txFee: Cardano.Lovelace;
  hasEnoughAda: boolean;
};

export const useCollateral = (): UseCollateralReturn => {
  const [txFee, setTxFee] = useState<Cardano.Lovelace>();
  const [txBuilder, setTxBuilder] = useState<TxBuilder>();
  const { inMemoryWallet, getKeyAgentType } = useWalletStore();
  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const addresses = useObservable(inMemoryWallet.addresses$);
  const walletAddress = addresses?.[0]?.address;
  const maxAvailableAda = useMaxAda();
  const hasEnoughAda = useMemo(() => maxAvailableAda >= COLLATERAL_AMOUNT_LOVELACES, [maxAvailableAda]);
  const isSyncingForTheFirstTime = useSyncingTheFirstTime(); // here we check wallet is syncing for the first time
  const output: Cardano.TxOut = useMemo(
    () => ({
      address: walletAddress && Cardano.PaymentAddress(walletAddress),
      value: {
        coins: COLLATERAL_AMOUNT_LOVELACES
      }
    }),
    [walletAddress]
  );

  const initializeCollateralTx = useCallback(async () => {
    // if the wallet has not been synced at least once or has no balance don't initialize Tx
    if (!hasEnoughAda || isSyncingForTheFirstTime) return;
    setIsInitializing(true);
    const builder = inMemoryWallet.createTxBuilder().addOutput(output);
    const tx = await builder.build().inspect();
    setTxFee(tx.body.fee);
    setTxBuilder(builder);
    setIsInitializing(false);
  }, [hasEnoughAda, isSyncingForTheFirstTime, inMemoryWallet, output]);

  const submitCollateralTx = async () => {
    if (!txBuilder) return;
    setIsSubmitting(true);
    try {
      const { tx } = await txBuilder.build().sign();
      await inMemoryWallet.submitTx(tx);
      const utxo = await firstValueFrom(
        inMemoryWallet.utxo.available$.pipe(
          map((utxos) => utxos.find((o) => o[0].txId === tx.id && o[1].value.coins === COLLATERAL_AMOUNT_LOVELACES)),
          filter(isNotNil),
          take(1)
        )
      );
      await inMemoryWallet.utxo.setUnspendable([utxo]);
      // TODO: Remove this workaround for Hardware Wallets alongside send flow and staking.
      if (!isInMemory) window.location.reload();
    } finally {
      setIsSubmitting(false);
    }
  };
  return {
    initializeCollateralTx,
    submitCollateralTx,
    isInitializing,
    isSubmitting,
    txFee,
    hasEnoughAda
  };
};
