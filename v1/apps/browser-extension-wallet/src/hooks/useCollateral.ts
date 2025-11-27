/* eslint-disable unicorn/no-useless-undefined */
import { useCallback, useMemo, useState, useEffect } from 'react';
import { logger, useObservable } from '@lace/common';
import { firstValueFrom } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';
import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Cardano } from '@cardano-sdk/core';
import { isNotNil } from '@cardano-sdk/util';
import { useWalletStore } from '@src/stores';
import { useSyncingTheFirstTime } from '@hooks/useSyncingTheFirstTime';
import { useBuiltTxState } from '@src/views/browser-view/features/send-transaction';
import { COLLATERAL_AMOUNT_LOVELACES } from '@utils/constants';
import { useHasEnoughCollateral } from '@hooks/useHasEnoughCollateral';

export type UseCollateralReturn = {
  initializeCollateralTx: () => Promise<void>;
  submitCollateralTx: () => Promise<void>;
  isInitializing: boolean;
  isSubmitting: boolean;
  txFee: Cardano.Lovelace;
  hasEnoughAda: boolean;
  txBuilder?: TxBuilder;
  pureUtxoWithEnoughCoinToUseForCollateral?: Cardano.Utxo[];
};

export const useCollateral = (): UseCollateralReturn => {
  const [txFee, setTxFee] = useState<Cardano.Lovelace>();
  const [txBuilder, setTxBuilder] = useState<TxBuilder | undefined>();
  const { inMemoryWallet, isInMemoryWallet } = useWalletStore();
  const { setBuiltTxData } = useBuiltTxState();
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const addresses = useObservable(inMemoryWallet?.addresses$);
  const walletAddress = addresses?.[0]?.address;
  const hasEnoughAda = useHasEnoughCollateral();
  const isSyncingForTheFirstTime = useSyncingTheFirstTime(); // here we check wallet is syncing for the first time
  const [pureUtxoWithEnoughCoinToUseForCollateral, setPureUtxoWithEnoughCoinToUseForCollateral] =
    useState<Cardano.Utxo[]>();
  const unspendable = useObservable(inMemoryWallet?.balance?.utxo.unspendable$);
  const hasCollateral = useMemo(() => unspendable?.coins >= COLLATERAL_AMOUNT_LOVELACES, [unspendable?.coins]);

  const output: Cardano.TxOut = useMemo(
    () => ({
      address: walletAddress && Cardano.PaymentAddress(walletAddress),
      value: {
        coins: COLLATERAL_AMOUNT_LOVELACES
      }
    }),
    [walletAddress]
  );

  useEffect(() => {
    const isPureUtxoWithEnoughCoins = (utxo: Cardano.Utxo): boolean =>
      !utxo[1].value?.assets && utxo[1].value.coins === COLLATERAL_AMOUNT_LOVELACES;

    const checkCollateral = async (): Promise<void> => {
      if (!inMemoryWallet?.utxo?.available$) return;

      // Get the first emission of available UTXOs and check if any match
      const utxos = await firstValueFrom(inMemoryWallet.utxo.available$.pipe(take(1)));
      const matchingUtxo = utxos.find((o) => isPureUtxoWithEnoughCoins(o));

      if (matchingUtxo) {
        setPureUtxoWithEnoughCoinToUseForCollateral([matchingUtxo]);
      } else {
        // No suitable UTXO found - set empty array to indicate check is complete
        setPureUtxoWithEnoughCoinToUseForCollateral([]);
      }
    };

    if (!hasCollateral) checkCollateral();
    else setPureUtxoWithEnoughCoinToUseForCollateral([]);

    return () => setPureUtxoWithEnoughCoinToUseForCollateral(undefined);
  }, [
    hasEnoughAda,
    hasCollateral,
    inMemoryWallet?.utxo?.available$,
    unspendable,
    setPureUtxoWithEnoughCoinToUseForCollateral
  ]);

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

  const submitCollateralTx = useCallback(async () => {
    if (!txBuilder) return;
    setIsSubmitting(true);
    try {
      const txBuilt = txBuilder.build();
      const signedTx = await txBuilt.sign();
      await inMemoryWallet.submitTx(signedTx);
      const utxo = await firstValueFrom(
        inMemoryWallet.utxo.available$.pipe(
          map((utxos) =>
            utxos.find((o) => o[0].txId === signedTx.tx.id && o[1].value.coins === COLLATERAL_AMOUNT_LOVELACES)
          ),
          filter(isNotNil),
          take(1)
        )
      );
      await inMemoryWallet.utxo.setUnspendable([utxo]);
      // set tx data in case of hw for tx success/fail steps
      if (!isInMemoryWallet) {
        const txInspection = await txBuilt.inspect();
        setBuiltTxData({
          uiTx: {
            fee: txInspection.inputSelection.fee,
            hash: txInspection.hash,
            outputs: txInspection.inputSelection.outputs
          }
        });
      }
    } catch (error) {
      // redirect to tx fail screen in case of hw
      if (!isInMemoryWallet) {
        logger.error('submitCollateralTx fails with:', error?.message);
        setBuiltTxData({
          uiTx: undefined,
          error: error.message
        });
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [txBuilder, inMemoryWallet, isInMemoryWallet, setBuiltTxData]);
  return {
    initializeCollateralTx,
    submitCollateralTx,
    isInitializing,
    isSubmitting,
    txFee,
    hasEnoughAda,
    txBuilder,
    pureUtxoWithEnoughCoinToUseForCollateral
  };
};
