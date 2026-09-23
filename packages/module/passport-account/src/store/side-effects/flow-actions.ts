import { catchError, mergeMap, of } from 'rxjs';

import type { FlowEvent } from '../dependencies';
import type { PassportFlowError, SideEffect } from '@lace-contract/passport';
import type { Observable } from 'rxjs';

type StoreActions = Parameters<SideEffect>[2]['actions'];
type SideEffectAction = ReturnType<SideEffect> extends Observable<infer A>
  ? A
  : never;

/**
 * The flow error a failure reports: the error's own typed code when it
 * carries one, otherwise the flow's fallback code.
 */
export const toFlowError = (
  error: unknown,
  fallbackCode: string,
): PassportFlowError => ({
  code:
    error instanceof Object && 'code' in error && typeof error.code === 'string'
      ? error.code
      : fallbackCode,
  message: error instanceof Error ? error.message : String(error),
});

type FlowActionsProps<T> = {
  actions: StoreActions;
  /** Flow error code when the failure carries no typed code. */
  fallbackCode: string;
  /** The actions that publish the flow's result, emitted before 'ready'. */
  onDone: (result: T) => SideEffectAction[];
};

/**
 * Maps a flow's events onto the passport flow state: each stage to
 * setFlow, the result to its publishing actions followed by
 * setFlow('ready'), and a failure to a single setFlowError, so a flow
 * always settles in 'ready' or 'error'.
 */
export const flowActions = <T>(
  events$: Observable<FlowEvent<T>>,
  { actions, fallbackCode, onDone }: FlowActionsProps<T>,
): Observable<SideEffectAction> =>
  events$.pipe(
    mergeMap(event =>
      event.type === 'progress'
        ? [actions.passport.setFlow(event.stage)]
        : [...onDone(event.result), actions.passport.setFlow('ready')],
    ),
    catchError(error =>
      of(actions.passport.setFlowError(toFlowError(error, fallbackCode))),
    ),
  );
