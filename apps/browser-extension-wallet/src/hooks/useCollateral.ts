import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useCallback, useMemo, useState } from 'react';
import { useObservable } from './useObservable';
import { useMaxAda } from '@hooks/useMaxAda';
import { firstValueFrom } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';
import { isNotNil } from '@cardano-sdk/util';
import { useSyncingTheFirstTime } from './useSyncingTheFirstTime';

const COLLATERAL_ADA_AMOUNT = 5;
export const COLLATERAL_AMOUNT_LOVELACES = BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT)));

type TX_STATE = Cardano.TxBodyWithHash | null;

type UseCollateralReturn = {
  initializeCollateralTx: () => Promise<void>;
  submitCollateralTx: () => Promise<void>;
  isInitializing: boolean;
  isSubmitting: boolean;
  tx: TX_STATE;
  hasEnoughAda: boolean;
};

export const useCollateral = (): UseCollateralReturn => {
  const [tx, setTx] = useState<TX_STATE>();
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
    const initialTx = await inMemoryWallet.initializeTx({ outputs: new Set([output]) });
    setTx(initialTx);
    setIsInitializing(false);
  }, [inMemoryWallet, output, hasEnoughAda, isSyncingForTheFirstTime]);
  const submitCollateralTx = async () => {
    if (!tx) return;
    setIsSubmitting(true);
    try {
      const signedTx = await inMemoryWallet.finalizeTx({
        tx
      });
      await inMemoryWallet.submitTx(signedTx);
      const utxo = await firstValueFrom(
        inMemoryWallet.utxo.available$.pipe(
          map((utxos) =>
            utxos.find((o) => o[0].txId === signedTx.id && o[1].value.coins === COLLATERAL_AMOUNT_LOVELACES)
          ),
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
    tx,
    hasEnoughAda
  };
};
