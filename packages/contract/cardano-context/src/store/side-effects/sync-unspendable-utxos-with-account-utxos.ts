import { AccountId } from '@lace-contract/wallet-repo';
import { combineLatest, EMPTY, mergeMap, of, type Observable } from 'rxjs';

import { utxoKey } from '../../util';

import type { SideEffect, Action } from '../../contract';

/**
 * Side effect that removes UTXOs from accountUnspendableUtxos when they are
 * no longer present in accountUtxos (e.g. after being spent). Keeps
 * unspendable list in sync with current account UTXOs.
 */
export const syncUnspendableUtxosWithAccountUtxos: SideEffect = (
  _,
  { cardanoContext: { selectAccountUtxos$, selectAccountUnspendableUtxos$ } },
  { actions },
) =>
  combineLatest([selectAccountUtxos$, selectAccountUnspendableUtxos$]).pipe(
    mergeMap(([accountUtxos, accountUnspendableUtxos]): Observable<Action> => {
      const actionsToDispatch: Action[] = [];

      for (const accountId of Object.keys(accountUnspendableUtxos)) {
        const unspendableUtxos =
          accountUnspendableUtxos[AccountId(accountId)] ?? [];
        if (unspendableUtxos.length === 0) continue;

        const availableUtxoKeys = new Set(
          (accountUtxos[AccountId(accountId)] ?? []).map(utxoKey),
        );
        const filteredUnspendable = unspendableUtxos.filter(utxo =>
          availableUtxoKeys.has(utxoKey(utxo)),
        );

        if (filteredUnspendable.length !== unspendableUtxos.length) {
          actionsToDispatch.push(
            actions.cardanoContext.setAccountUnspendableUtxos({
              accountId: AccountId(accountId),
              utxos: filteredUnspendable,
            }),
          );
        }
      }

      return actionsToDispatch.length > 0 ? of(...actionsToDispatch) : EMPTY;
    }),
  );
