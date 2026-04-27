import { filter, map, merge, of, shareReplay, take } from 'rxjs';
import { v4 } from 'uuid';

import { txExecutorActions } from './slice';

import type { MapOfExecutorConfig, TxPhaseConfig } from './slice';
import type { ActionCreators } from '../contract';
import type { TxExecutorImplementationMethodName } from '../types';
import type { ActionObservables } from '@lace-contract/module';

export const makeEntryPoint =
  <
    Type extends TxExecutorImplementationMethodName,
    Config extends MapOfExecutorConfig[Type],
    Params extends Config['params'],
  >(
    type: Type,
  ) =>
  ({ txPhaseCompleted$ }: ActionObservables<ActionCreators>['txExecutor']) =>
  <MappedResult>(
    params: Params,
    mapResult: (result: Config['result']) => MappedResult,
  ) => {
    const executionId = v4();

    return merge(
      txPhaseCompleted$.pipe(
        filter(({ payload }) => payload.executionId === executionId),
        take(1),
        map(({ payload }) => payload.result),
        map(result => mapResult(result)),
      ),
      of(
        txExecutorActions.txExecutor.txPhaseRequested({
          executionId,
          config: {
            params,
            type,
          } as TxPhaseConfig & { type: Type },
        }),
      ),
    ).pipe(shareReplay());
  };

export const makeBuildTx = makeEntryPoint('buildTx');
export type BuildTx = ReturnType<typeof makeBuildTx>;

export const makePreviewTx = makeEntryPoint('previewTx');
export type PreviewTx = ReturnType<typeof makePreviewTx>;

export const makeConfirmTx = makeEntryPoint('confirmTx');
export type ConfirmTx = ReturnType<typeof makeConfirmTx>;

export const makeDiscardTx = makeEntryPoint('discardTx');
export type DiscardTx = ReturnType<typeof makeDiscardTx>;

export const makeSubmitTx = makeEntryPoint('submitTx');
export type SubmitTx = ReturnType<typeof makeSubmitTx>;
