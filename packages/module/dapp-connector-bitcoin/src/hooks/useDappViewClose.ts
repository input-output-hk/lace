import type { RefObject } from 'react';

import { useCallback } from 'react';

import { useDispatchLaceAction, useLaceSelector } from './storeHooks';

import type { ViewLocation } from '@lace-contract/views';

/**
 * Close handler for the Bitcoin dApp sign review screens.
 *
 * SidePanel: dismiss the sheet via `setActiveSheetPage(null)`.
 * PopupWindow: dispatch `closePopupRequested` so a side effect
 * resolves the view id and asks the SW to close it; `views.closeView` reaches
 * the view's remote `close()`, which runs `window.close()` in that popup's own
 * document. Going through the SW addresses the window by id rather than needing
 * a handle on its document. The review side effect
 * closes the popup only on cancellation, rejection or disconnect; after a
 * confirmed signing outcome the popup closes itself through this hook once the
 * pending request clears, while the sheet stays open showing the result screen
 * until its Close button dismisses it.
 *
 * `requestIdRef` holds the id of the request this view is showing. It is read
 * at close time, not at render time, so the close is attributed to the request
 * the user was answering — a queued request that has since taken the window
 * over keeps it. Omit it for views that never host a queued request.
 */
export const useDappViewClose = (
  popupLocation?: ViewLocation,
  requestIdRef?: RefObject<string | undefined>,
): (() => void) => {
  const activeSheetPage = useLaceSelector('views.getActiveSheetPage');
  const setActiveSheetPage = useDispatchLaceAction('views.setActiveSheetPage');
  const requestPopupClose = useDispatchLaceAction(
    'bitcoinDappConnector.closePopupRequested',
  );

  return useCallback(() => {
    if (activeSheetPage) {
      setActiveSheetPage(null);
      return;
    }

    if (popupLocation) {
      requestPopupClose({
        location: popupLocation,
        requestId: requestIdRef?.current,
      });
      return;
    }

    window.close();
  }, [
    activeSheetPage,
    popupLocation,
    requestIdRef,
    requestPopupClose,
    setActiveSheetPage,
  ]);
};
