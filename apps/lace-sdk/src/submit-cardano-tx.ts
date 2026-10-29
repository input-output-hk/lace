import { CardanoTxId } from '@lace-contract/cardano-context';
import { Err, Ok } from '@lace-lib/util';
import { filter, firstValueFrom, merge, map, timeout } from 'rxjs';

import type { HexBytes, Result } from '@lace-lib/util';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

const SUBMIT_TX_TIMEOUT_MS = 60_000;

/**
 * Structural requirement: the wallet must have been created with
 * Cardano modules loaded (blockchainCardano + cardanoProviderBlockfrost).
 */
export type WalletWithCardanoSubmit = {
  actionObservables: {
    cardanoContext: {
      submitTxCompleted$: Observable<PayloadAction<{ txId: CardanoTxId }>>;
      submitTxFailed$: Observable<
        PayloadAction<{ txId: CardanoTxId; error: string }>
      >;
    };
  };
  dispatch: (
    key: 'cardanoContext.submitTx',
    props: { serializedTx: HexBytes },
  ) => void;
};

/** The options of `submitCardanoTx`. */
export interface SubmitCardanoTxProps {
  /** The signed transaction, as CBOR hex. */
  serializedTx: HexBytes;
}

/**
 * Submits a signed transaction through the wallet's Cardano provider and
 * waits up to 60 seconds for the provider's answer.
 *
 * @param wallet - A wallet with the Cardano modules loaded (see
 *   {@link WalletWithCardanoSubmit}).
 * @param props - The signed transaction.
 * @returns `Ok` with the transaction ID once the provider accepts it, or
 *   `Err` with the provider's refusal or a timeout. It never rejects.
 */
export const submitCardanoTx = async (
  wallet: WalletWithCardanoSubmit,
  props: SubmitCardanoTxProps,
): Promise<Result<{ txId: CardanoTxId }, Error>> => {
  const { serializedTx } = props;

  try {
    const txId = CardanoTxId.fromCbor(serializedTx);

    // --- Subscribe to result actions BEFORE dispatching ---
    const result$ = merge(
      wallet.actionObservables.cardanoContext.submitTxCompleted$.pipe(
        filter(({ payload }) => payload.txId === txId),
        map(({ payload }) => Ok({ txId: payload.txId })),
      ),
      wallet.actionObservables.cardanoContext.submitTxFailed$.pipe(
        filter(({ payload }) => payload.txId === txId),
        map(({ payload }) => Err(new Error(payload.error))),
      ),
    ).pipe(timeout(SUBMIT_TX_TIMEOUT_MS));
    const resultPromise = firstValueFrom(result$);

    // --- Dispatch submit action ---
    wallet.dispatch('cardanoContext.submitTx', { serializedTx });

    // --- Await result ---
    return await resultPromise;
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
