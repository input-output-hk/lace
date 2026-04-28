import { utxoKey } from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { merge, of, switchMap, withLatestFrom } from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';

/**
 * When collateral flow enters SettingUnspendable state, mark the matching UTXO
 * as unspendable in the store. If UTXO not found, transition to Failure.
 */
export const settingUnspendableSideEffect = (
  _actionObservables: CollateralFlowSideEffectParams[0],
  stateObservables: CollateralFlowSideEffectParams[1],
  dependencies: CollateralFlowSideEffectParams[2],
) => {
  const {
    cardanoContext: { selectAccountUtxos$, selectAccountUnspendableUtxos$ },
    collateralFlow: { selectState$ },
  } = stateObservables;
  const { actions } = dependencies;

  return firstStateOfStatus(selectState$, 'SettingUnspendable').pipe(
    withLatestFrom(selectAccountUtxos$, selectAccountUnspendableUtxos$),
    switchMap(([state, accountUtxos, accountUnspendableUtxos]) => {
      const accountId = AccountId(state.accountId);
      const accountUtxosList = accountUtxos[accountId] ?? [];

      const collateralUtxo = accountUtxosList.find(
        utxo => utxoKey(utxo) === state.txKey,
      );

      if (collateralUtxo) {
        const currentUnspendable = accountUnspendableUtxos[accountId] ?? [];
        const updatedUnspendable = [...currentUnspendable, collateralUtxo];

        return merge(
          of(
            actions.cardanoContext.setAccountUnspendableUtxos({
              accountId,
              utxos: updatedUnspendable,
            }),
          ),
          of(actions.collateralFlow.utxoSet()),
        );
      }

      return of(actions.collateralFlow.utxoNotFound());
    }),
  );
};
