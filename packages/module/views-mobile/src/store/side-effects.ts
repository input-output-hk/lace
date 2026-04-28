import { MOBILE_VIEW_ID } from '@lace-contract/views';
import { map, mergeMap, of, throwError } from 'rxjs';

import type { SideEffect } from '..';
import type { LaceInitSync } from '@lace-contract/module';

// assuming that we run the app in UI context (not background)
export const connectView: SideEffect = (_, __, { actions }) =>
  of(
    actions.views.viewConnected({
      id: MOBILE_VIEW_ID,
      location: '/',
      type: 'mobile',
    }),
  );

// TODO: MOBILE: can we close the app programatically?
export const closeView: SideEffect = ({ views: { closeView$ } }) =>
  closeView$.pipe(
    mergeMap(() => {
      return throwError(() => 'closeView is not implemented in mobile');
    }),
  );

export const openView: SideEffect = ({ views: { openView$ } }, _) =>
  openView$.pipe(
    mergeMap(() =>
      throwError(() => new Error('openView is not implemented in mobile')),
    ),
  );

export const navigate: SideEffect = (
  { views: { navigate$ } },
  _,
  { actions },
) =>
  navigate$.pipe(
    map(({ payload }) =>
      actions.views.locationChanged({
        viewId: payload.viewId,
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        location: payload.args[0].toString(),
      }),
    ),
  );

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => {
  return [connectView, openView, closeView, navigate];
};
