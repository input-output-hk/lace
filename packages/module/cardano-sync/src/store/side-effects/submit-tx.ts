import { CardanoTxId } from '@lace-contract/cardano-context';
import { map, mergeMap, of, withLatestFrom } from 'rxjs';

import type { SideEffect } from '../..';

export const submitTxSideEffect: SideEffect = (
  { cardanoContext: { submitTx$ } },
  { cardanoContext: { selectChainId$ } },
  { cardanoProvider, actions },
) =>
  submitTx$.pipe(
    withLatestFrom(selectChainId$),
    mergeMap(([{ payload }, chainId]) => {
      if (!chainId) {
        return of(
          actions.cardanoContext.submitTxFailed({
            txId: CardanoTxId.fromCbor(payload.serializedTx),
            error: 'Chain ID not found',
          }),
        );
      }
      return cardanoProvider
        .submitTx({ signedTransaction: payload.serializedTx }, { chainId })
        .pipe(
          map(result =>
            result.isOk()
              ? actions.cardanoContext.submitTxCompleted({
                  txId: result.value as CardanoTxId,
                })
              : actions.cardanoContext.submitTxFailed({
                  txId: CardanoTxId.fromCbor(payload.serializedTx),
                  error: result.error.message,
                }),
          ),
        );
    }),
  );
