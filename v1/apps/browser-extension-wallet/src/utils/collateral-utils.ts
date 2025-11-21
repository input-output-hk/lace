import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { firstValueFrom, take } from 'rxjs';
import { COLLATERAL_AMOUNT_LOVELACES } from './constants';

/**
 * Checks if a UTXO is unspendable (collateral) with too high coin lockup
 * @param utxo - The UTXO to check
 * @returns true if the UTXO has no assets and coins exceed the collateral amount threshold
 */
const isUnspendableWithTooHighCoinLockup = (utxo: Cardano.Utxo): boolean =>
  !utxo[1].value?.assets && utxo[1].value.coins > COLLATERAL_AMOUNT_LOVELACES;

/**
 * Automatically reclaims collateral UTXOs that are too large
 * If any unspendable UTXOs have a coin value over COLLATERAL_AMOUNT_LOVELACES,
 * they are automatically removed from the unspendable set to reclaim them
 * @param inMemoryWallet - The wallet instance
 */
export const autoReclaimLargeCollateralUtxos = async (inMemoryWallet: ObservableWallet): Promise<void> => {
  // Guard: return early if wallet is not available
  if (!inMemoryWallet?.utxo?.unspendable$) {
    return;
  }

  // if we've got utxos OVER COLLATERAL_AMOUNT_LOVELACES automatically reclaim them
  const collateral = await firstValueFrom(inMemoryWallet.utxo.unspendable$.pipe(take(1)));
  const matchingUnspendableUtxos = collateral.filter((o) => isUnspendableWithTooHighCoinLockup(o));

  if (matchingUnspendableUtxos.length > 0) {
    // Remove the matching unspendable UTXOs by setting unspendable to only the UTXOs that don't match
    const remainingUnspendableUtxos = collateral.filter((o) => !isUnspendableWithTooHighCoinLockup(o));
    await inMemoryWallet.utxo.setUnspendable(remainingUnspendableUtxos);
  }
};
