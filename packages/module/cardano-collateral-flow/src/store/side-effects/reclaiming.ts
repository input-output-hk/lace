import { utxoKey } from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { merge, of, switchMap, withLatestFrom } from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';

/**
 * When collateral flow enters Reclaiming state, remove the UTXO from
 * unspendables and transition to Idle.
 */
export const reclaimingSideEffect = (
  _actionObservables: CollateralFlowSideEffectParams[0],
  stateObservables: CollateralFlowSideEffectParams[1],
  dependencies: CollateralFlowSideEffectParams[2],
) => {
  const {
    cardanoContext: { selectAccountUnspendableUtxos$ },
    collateralFlow: { selectState$ },
  } = stateObservables;
  const { actions } = dependencies;

  return firstStateOfStatus(selectState$, 'Reclaiming').pipe(
    withLatestFrom(selectAccountUnspendableUtxos$),
    switchMap(([state, accountUnspendableUtxos]) => {
      const accountId = AccountId(state.accountId);
      const currentUnspendable = accountUnspendableUtxos[accountId] ?? [];

      const filteredUnspendable = currentUnspendable.filter(
        utxo => utxoKey(utxo) !== state.txKey,
      );

      if (filteredUnspendable.length < currentUnspendable.length) {
        return merge(
          of(
            actions.cardanoContext.setAccountUnspendableUtxos({
              accountId,
              utxos: filteredUnspendable,
            }),
          ),
          of(actions.collateralFlow.reclaimSucceeded()),
        );
      }

      return of(actions.collateralFlow.reclaimSucceeded());
    }),
  );
};
