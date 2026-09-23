import { makeConfirmTx } from '@lace-contract/tx-executor';
import { dropStaleResult, firstStateOfStatus } from '@lace-lib/util-store';
import { switchMap } from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';
import type { CollateralFlowSliceState } from '@lace-contract/cardano-context';

// Closing the sheet moves Confirming -> DiscardingTx without cancelling the
// signing prompt, so a real confirmation can still land after the machine has
// moved on — and only Confirming handles it. Keep in sync with the state
// machine's `confirmationCompleted` handlers.
const CONFIRMATION_HANDLED_STATES = new Set<CollateralFlowSliceState['status']>(
  ['Confirming'],
);

/**
 * When collateral flow enters Confirming state, prompt for transaction confirmation.
 */
export const confirmingSideEffect = (
  actionObservables: CollateralFlowSideEffectParams[0],
  stateObservables: CollateralFlowSideEffectParams[1],
  dependencies: CollateralFlowSideEffectParams[2],
) => {
  const txExecutor = actionObservables.txExecutor;
  const confirmTx = makeConfirmTx(txExecutor);

  const {
    collateralFlow: { selectState$ },
  } = stateObservables;
  const { actions } = dependencies;

  return firstStateOfStatus(selectState$, 'Confirming').pipe(
    switchMap(state =>
      confirmTx(
        {
          accountId: state.accountId,
          blockchainName: 'Cardano',
          blockchainSpecificSendFlowData: {},
          serializedTx: state.serializedTx,
          wallet: state.wallet,
        },
        result =>
          actions.collateralFlow.confirmationCompleted({
            result,
          }),
      ),
    ),
    dropStaleResult(
      selectState$,
      actions.collateralFlow.confirmationCompleted.match,
      CONFIRMATION_HANDLED_STATES,
    ),
  );
};
