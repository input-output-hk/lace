import { useCallback } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../common/hooks';

import type { ViewLocation } from '@lace-contract/views';

/**
 * Close handler for sidePanel and popupWindow contexts.
 *
 * SidePanel: dismiss via `setActiveSheetPage(null)`.
 * PopupWindow: dispatch `closePopupRequested(location)` so a side effect
 * resolves the view id and asks the SW to close it via `chrome.windows.remove`
 * — `window.close()` is unreliable for SW-opened popups.
 */
export const useDappViewClose = (
  popupLocation?: ViewLocation,
): (() => void) => {
  const activeSheetPage = useLaceSelector('views.getActiveSheetPage');
  const setActiveSheetPage = useDispatchLaceAction('views.setActiveSheetPage');
  const requestPopupClose = useDispatchLaceAction(
    'cardanoDappConnector.closePopupRequested',
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
