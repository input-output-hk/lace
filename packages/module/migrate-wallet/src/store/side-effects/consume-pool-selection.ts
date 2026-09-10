import { filter, map, merge, mergeMap, of, withLatestFrom } from 'rxjs';

import { MIGRATE_WALLET_POOL_SELECTION_ID } from '../../const';

import type { SideEffect } from '../..';
import type { PoolSelection } from '@lace-contract/cardano-stake-pools';

/**
 * Consumes a pool the user picked for the migration's rewards set-up: records
 * it on the wizard (which advances to the review) and closes the picker sheet
 * covering it.
 *
 * A STORE side effect for the same reason as earn-rewards' consumer: the
 * navigator detaches covered screens, so nothing rendered under the picker can
 * be trusted to observe the selection. The wizard step gates consumption — a
 * matching id arriving at any other step is stale state from an abandoned run,
 * not an instruction, and is CLEARED rather than ignored (state observables
 * never re-emit an unchanged value, so residue in the slot only misleads a
 * later read). Cancelling the wizard clears the slot too, so a run abandoned
 * mid-pick leaves nothing behind. The selection is cleared on consumption; the
 * wizard's own `chosenPool` carries everything the review and delegation need.
 */
export const makeConsumePoolSelection =
  (): SideEffect =>
  (
    actionObservables,
    {
      cardanoStakePools: { selectPoolSelection$ },
      migrateWallet: { selectStep$ },
    },
    { actions },
  ) =>
    merge(
      selectPoolSelection$.pipe(
        filter(
          (selection): selection is PoolSelection =>
            selection !== undefined &&
            selection.selectionId === MIGRATE_WALLET_POOL_SELECTION_ID,
        ),
        withLatestFrom(selectStep$),
        mergeMap(([selection, step]) => {
          if (step !== 'choosePool') {
            return of(
              actions.cardanoStakePools.poolSelectionCleared({
                selectionId: selection.selectionId,
              }),
            );
          }
          return of(
            // The wizard is a global overlay under the picker sheet, so
            // revealing it again is a close, not a navigate — dispatched
            // through the views store because `NavigationControls` cannot
            // reach the navigator from a side effect: on the extension the
            // store runs in the service worker, where the navigation ref is
            // never set, and a direct call is silently dropped.
            actions.views.setActiveSheetPage(null),
            actions.migrateWallet.poolChosen({
              poolId: `${selection.poolId}`,
              ticker: selection.ticker,
              ros: selection.ros,
            }),
            actions.cardanoStakePools.poolSelectionCleared({
              selectionId: selection.selectionId,
            }),
          );
        }),
      ),
      // The id-checked reducer makes this a no-op when the slot is empty or
      // holds another flow's pick.
      actionObservables.migrateWallet.wizardCancelled$.pipe(
        map(() =>
          actions.cardanoStakePools.poolSelectionCleared({
            selectionId: MIGRATE_WALLET_POOL_SELECTION_ID,
          }),
        ),
      ),
    );
