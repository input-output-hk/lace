import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  skipWhile,
} from 'rxjs';

import type { SideEffect } from '../../contract';

/**
 * Cancels an open prompt while no view is left to render it.
 *
 * `authenticate()` settles only when the prompt UI answers it, and that UI is
 * rendered by the open views — so a prompt with nowhere to render can never be
 * answered, and every caller awaiting it parks forever. On the extension that
 * parks the whole serialized dApp signing queue until the worker restarts.
 *
 * Deliberately a conjunction, not a reaction to the last view closing: the
 * prompt is just as unanswerable when it opens AFTER that (the signing wrapper
 * reaches `authenticate()` only after several provider round trips, so the
 * window it is requested in may already have gone).
 *
 * `Completing` needs no special case: the state machine has no `cancelled`
 * transition there, so a late cancel cannot turn a success into a refusal.
 */
export const cancelPromptWithoutView: SideEffect = (
  _,
  { authenticationPrompt: { isOpen$ }, views: { selectOpenViews$ } },
  { actions },
) =>
  combineLatest([
    selectOpenViews$.pipe(
      map(openViews => openViews.length === 0),
      // Until the first view registers there is nothing to have lost, and a
      // prompt opened in that window is still answerable once one appears.
      skipWhile(hasNoView => hasNoView),
    ),
    isOpen$,
  ]).pipe(
    map(([hasNoView, isOpen]) => hasNoView && isOpen),
    distinctUntilChanged(),
    filter(Boolean),
    map(() => actions.authenticationPrompt.cancelled()),
  );
