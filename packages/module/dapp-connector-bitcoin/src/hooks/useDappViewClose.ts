import { useCallback } from 'react';

import { useDispatchLaceAction, useLaceSelector } from './storeHooks';

import type { ViewLocation } from '@lace-contract/views';

/**
 * Close handler for the Bitcoin dApp sign review screens.
 *
 * SidePanel: dismiss the sheet via `setActiveSheetPage(null)`.
 * PopupWindow: dispatch `closePopupRequested(location)` so a side effect
 * resolves the view id and asks the SW to close it; `views.closeView` reaches
 * the view's remote `close()`, which runs `window.close()` in that popup's own
 * document. Going through the SW addresses the window by id rather than needing
 * a handle on its document. The review side effect
 * closes the popup only on cancellation, rejection or disconnect; after a
 * confirmed signing outcome the popup closes itself through this hook once the
 * pending request clears, while the sheet stays open showing the result screen
 * until its Close button dismisses it.
 */
export const useDappViewClose = (
  popupLocation?: ViewLocation,
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
      requestPopupClose(popupLocation);
      return;
    }

    window.close();
  }, [activeSheetPage, popupLocation, requestPopupClose, setActiveSheetPage]);
};
