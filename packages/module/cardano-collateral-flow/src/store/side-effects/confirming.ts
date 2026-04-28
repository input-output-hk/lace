import { makeConfirmTx } from '@lace-contract/tx-executor';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { switchMap } from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';

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
  );
};
