import {
  getEligibleCollateralUtxo,
  utxoKey,
} from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { of, switchMap, withLatestFrom } from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';

/**
 * When collateral flow enters Requested state, check for existing unspendable UTXOs
 * and eligible collateral in account UTXOs. If unspendable found → Set; if eligible
 * collateral found → Ready; otherwise → Building.
 */
export const requestedSideEffect = (
  _actionObservables: CollateralFlowSideEffectParams[0],
  stateObservables: CollateralFlowSideEffectParams[1],
  dependencies: CollateralFlowSideEffectParams[2],
) => {
  const {
    cardanoContext: { selectAccountUnspendableUtxos$, selectAccountUtxos$ },
    collateralFlow: { selectState$ },
  } = stateObservables;
  const { actions } = dependencies;

  return firstStateOfStatus(selectState$, 'Requested').pipe(
    withLatestFrom(selectAccountUnspendableUtxos$, selectAccountUtxos$),
    switchMap(([state, accountUnspendableUtxos, accountUtxos]) => {
      const accountId = AccountId(state.accountId);
      const unspendableUtxos = accountUnspendableUtxos[accountId] ?? [];

      if (unspendableUtxos.length > 0) {
        return of(
          actions.collateralFlow.unspendableUtxoFound({
            txKey: utxoKey(unspendableUtxos[0]),
          }),
        );
      }

      const eligibleCollateralUtxo = getEligibleCollateralUtxo(
        accountUtxos[accountId] ?? [],
      );

      if (eligibleCollateralUtxo) {
        return of(
          actions.collateralFlow.eligibleCollateralFound({
            txKey: utxoKey(eligibleCollateralUtxo),
          }),
        );
      }

      return of(actions.collateralFlow.noUnspendableUtxo());
    }),
  );
};
