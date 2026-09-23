import type { RefObject } from 'react';

import { useCallback } from 'react';

import { useDispatchLaceAction } from '../../common/hooks';

import type { ViewLocation } from '@lace-contract/views';

/**
 * Close handler for the surface a dApp view is presented on.
 *
 * `popupLocation` IS the surface: a location means the view owns a popup
 * window, none means it is a sheet. Never infer the surface from
 * `activeSheetPage` — every view of the wallet shares that state and it races
 * the close, so a sheet view can read it as falsy while still presented.
 *
 * Both surfaces only ASK; the SW decides, since only it knows whether a queued
 * request has inherited the window or the sheet since.
 *
 * `requestIdRef` names the request the close answers, read at close time so it
 * follows the request the surface is showing. Required for a sheet:
 * `closeRequestedSheet` refuses a close naming none, so such a sheet could not
 * be dismissed. A popup close naming none is honoured.
 */
export const useDappViewClose = (
  popupLocation?: ViewLocation,
  requestIdRef?: RefObject<string | undefined>,
): (() => void) => {
  const requestPopupClose = useDispatchLaceAction(
    'cardanoDappConnector.closePopupRequested',
  );
  const requestSheetClose = useDispatchLaceAction(
    'cardanoDappConnector.closeSheetRequested',
  );

  return useCallback(() => {
    if (popupLocation) {
      requestPopupClose({
        location: popupLocation,
        requestId: requestIdRef?.current,
      });
      return;
    }

    requestSheetClose({ requestId: requestIdRef?.current });
  }, [popupLocation, requestIdRef, requestPopupClose, requestSheetClose]);
};
