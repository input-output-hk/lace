import { COLLATERAL_AMOUNT_LOVELACES } from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstStateOfStatus } from '@lace-lib/util-store';
import {
  filter,
  map,
  merge,
  mergeMap,
  of,
  race,
  switchMap,
  take,
  timer,
  withLatestFrom,
} from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';
import type { Cardano } from '@cardano-sdk/core';

const isExpectedCollateralUtxo =
  (txId: string) =>
  (utxo: Cardano.Utxo): boolean =>
    utxo[0].txId.toString() === txId &&
    utxo[1].value.coins === BigInt(COLLATERAL_AMOUNT_LOVELACES);

/** 2 minutes to account for potential slowness of tx commitment */
const AWAIT_UTXO_TIMEOUT_MS = 120_000;

/**
 * When collateral flow enters AwaitingUtxo state, race between the expected
 * UTXO appearing in the store (selectAccountUtxos$ emits when UTXOs change)
 * and a 2-minute timeout. Marks UTXO unspendable when found; dispatches
 * utxoTimeout if the timeout wins.
 */
export const awaitingUtxoSideEffect = (
  _actionObservables: CollateralFlowSideEffectParams[0],
  stateObservables: CollateralFlowSideEffectParams[1],
  dependencies: CollateralFlowSideEffectParams[2],
) => {
  const {
    cardanoContext: { selectAccountUtxos$, selectAccountUnspendableUtxos$ },
    collateralFlow: { selectState$ },
  } = stateObservables;
  const { actions, logger } = dependencies;

  return firstStateOfStatus(selectState$, 'AwaitingUtxo').pipe(
    withLatestFrom(selectAccountUtxos$, selectAccountUnspendableUtxos$),
    switchMap(([state, accountUtxos, accountUnspendableUtxos]) => {
      // Race: UTXO appears (current snapshot or selectAccountUtxos$ on change) vs timeout
      const utxoFound$ = merge(
        of([accountUtxos, accountUnspendableUtxos] as const),
        selectAccountUtxos$.pipe(
          withLatestFrom(selectAccountUnspendableUtxos$),
          map(
            ([utxos, unspendableUtxos]) => [utxos, unspendableUtxos] as const,
          ),
        ),
      ).pipe(
        map(([utxos, unspendableUtxos]) => {
          const list = utxos[AccountId(state.accountId)] ?? [];
          const found = list.find(isExpectedCollateralUtxo(state.txId));
          return found
            ? { utxo: found, accountUnspendableUtxos: unspendableUtxos }
            : null;
        }),
        filter((x): x is NonNullable<typeof x> => x !== null),
        take(1),
        mergeMap(({ utxo, accountUnspendableUtxos }) => {
          const currentUnspendable =
            accountUnspendableUtxos[state.accountId] ?? [];
          const updatedUnspendable = [...currentUnspendable, utxo];

          return merge(
            of(
              actions.cardanoContext.setAccountUnspendableUtxos({
                accountId: state.accountId,
                utxos: updatedUnspendable,
              }),
            ),
            of(actions.collateralFlow.utxoFound()),
          );
        }),
      );

      const timeout$ = timer(AWAIT_UTXO_TIMEOUT_MS).pipe(
        mergeMap(() => {
          logger.error(
            'Timeout waiting for collateral UTXO to appear (2 min exceeded)',
          );
          return of(actions.collateralFlow.utxoTimeout());
        }),
      );

      return race(utxoFound$, timeout$);
    }),
  );
};
