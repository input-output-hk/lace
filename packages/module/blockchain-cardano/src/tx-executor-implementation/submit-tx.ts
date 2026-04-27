import {
  genericErrorResults,
  type TxExecutorImplementation,
} from '@lace-contract/tx-executor';
import { mergeMap, map, of } from 'rxjs';

import type { SideEffectDependencies } from '@lace-contract/module';

export const makeSubmitTx =
  (
    dependencies: SideEffectDependencies,
  ): TxExecutorImplementation['submitTx'] =>
  props =>
    dependencies.txExecutorCardano.cardanoChainId$.pipe(
      mergeMap(chainId => {
        if (!chainId) {
          return of(
            genericErrorResults.submitTx({
              error: new Error('Chain ID not found'),
            }),
          );
        }
        return dependencies.cardanoProvider
          .submitTx({ signedTransaction: props.serializedTx }, { chainId })
          .pipe(
            map(result => {
              if (result.isOk()) {
                return { success: true, txId: result.value } as const;
              }
              return genericErrorResults.submitTx({ error: result.error });
            }),
          );
      }),
    );
