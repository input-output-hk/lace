import { makeSubmitTx } from '@lace-contract/tx-executor';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { mergeMap, of, switchMap } from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';

/**
 * When collateral flow enters Submitting state, submit the transaction.
 */
export const submittingSideEffect = (
  actionObservables: CollateralFlowSideEffectParams[0],
  stateObservables: CollateralFlowSideEffectParams[1],
  dependencies: CollateralFlowSideEffectParams[2],
) => {
  const txExecutor = actionObservables.txExecutor;
  const submitTx = makeSubmitTx(txExecutor);

  const {
    collateralFlow: { selectState$ },
  } = stateObservables;
  const { actions } = dependencies;

  return firstStateOfStatus(selectState$, 'Submitting').pipe(
    switchMap(state => {
      return submitTx(
        {
          accountId: state.accountId,
          serializedTx: state.serializedTx,
          blockchainName: 'Cardano',
          blockchainSpecificSendFlowData: {},
        },
        result => result,
      ).pipe(
        mergeMap(value => {
          if (!('success' in value)) {
            return of(value);
          }

          return of(
            actions.collateralFlow.submissionCompleted({
              result: value,
            }),
          );
        }),
      );
    }),
  );
};
