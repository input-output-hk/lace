import { makeDiscardTx } from '@lace-contract/tx-executor';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { switchMap } from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';

/**
 * When collateral flow enters DiscardingTx state, discard the transaction.
 */
export const discardingSideEffect = (
  actionObservables: CollateralFlowSideEffectParams[0],
  stateObservables: CollateralFlowSideEffectParams[1],
  dependencies: CollateralFlowSideEffectParams[2],
) => {
  const txExecutor = actionObservables.txExecutor;
  const discardTx = makeDiscardTx(txExecutor);

  const {
    collateralFlow: { selectState$ },
  } = stateObservables;
  const { actions, logger } = dependencies;

  return firstStateOfStatus(selectState$, 'DiscardingTx').pipe(
    switchMap(state => {
      return discardTx(
        {
          serializedTx: state.serializedTx,
          blockchainName: 'Cardano',
        },
        ({ success }) => {
          if (!success) {
            logger.error('Failed to discard collateral flow transaction');
          }
          return actions.collateralFlow.discardingTxCompleted();
        },
      );
    }),
  );
};
