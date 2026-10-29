import { ignoreElements, map, tap } from 'rxjs';

import type { SideEffect } from '../../context';

export const watchProofActivities: SideEffect = (
  _actions,
  _state,
  { actions, wasmProofActivities$ },
) =>
  wasmProofActivities$.pipe(
    map(activities =>
      actions.midnightContext.proofActivitiesUpdated(activities),
    ),
  );

export const dismissProofActivity: SideEffect = (
  { midnightContext: { proofActivityDismissRequested$ } },
  _state,
  { dismissWasmProofActivity },
) =>
  proofActivityDismissRequested$.pipe(
    tap(({ payload }) => {
      dismissWasmProofActivity(payload);
    }),
    ignoreElements(),
  );
