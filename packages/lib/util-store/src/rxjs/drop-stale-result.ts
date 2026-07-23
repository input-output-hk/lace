import { filter, map, startWith, withLatestFrom } from 'rxjs';

import type { Observable } from 'rxjs';

/**
 * State-machine side-effects deliver their results asynchronously, so a result can
 * arrive after the machine has already advanced past — or torn down from — the state
 * that owns it (a race, or an abrupt close-all teardown). Dispatching it then makes
 * {@link createStateMachine} throw "handler not found for status X and event Y".
 *
 * This operator drops the side-effect's RESULT action (identified by its RTK matcher)
 * when the live machine status is no longer one that handles it, while passing every
 * other emitted action through untouched (e.g. an intermediate `txPhaseRequested`, or
 * an activity upsert dispatched alongside the result). It is scoped to a single result
 * type, so a genuinely misrouted event from another producer still surfaces — only this
 * producer's own stale result is suppressed.
 *
 * Keep `handledIn` in sync with the state machine's handlers for the result event.
 *
 * @param state$ - the live machine state stream (only `status` is read).
 * @param isResultAction - RTK matcher for the result action this side-effect emits.
 * @param handledIn - the statuses in which the machine handles that result.
 */
export const dropStaleResult =
  (
    state$: Observable<{ status: string }>,
    isResultAction: (action: { type: string }) => boolean,
    handledIn: ReadonlySet<string>,
  ) =>
  <A extends { type: string }>(source$: Observable<A>): Observable<A> => {
    // A synchronously-delivered result means no transition happened since the
    // side-effect fired, so the machine is still in a handling state. Seeding
    // `withLatestFrom` with a handled status keeps such a result from being dropped
    // before `state$` emits; any later state change overrides the seed.
    const [seedStatus = ''] = handledIn;
    return source$.pipe(
      withLatestFrom(state$.pipe(startWith({ status: seedStatus }))),
      filter(
        ([action, state]) =>
          !isResultAction(action) || handledIn.has(state.status),
      ),
      map(([action]) => action),
    );
  };
