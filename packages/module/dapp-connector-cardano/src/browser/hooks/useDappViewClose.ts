import { viewsActions, viewsSelectors } from '@lace-contract/views';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * Returns a close handler that works in both sidePanel and popupWindow contexts.
 *
 * - SidePanel: dispatches `views.setActiveSheetPage(null)` to dismiss the sheet.
 * - PopupWindow: calls `window.close()` to close the popup.
 *
 * Detection: if `views.getActiveSheetPage` is non-null the view was opened via
 * `setActiveSheetPage`, meaning we are inside a sidePanel sheet.
 */
export const useDappViewClose = (): (() => void) => {
  const activeSheetPage = useSelector(viewsSelectors.views.getActiveSheetPage);
  const dispatch = useDispatch();

  return useCallback(() => {
    if (activeSheetPage) {
      dispatch(viewsActions.views.setActiveSheetPage(null));
    } else {
      window.close();
    }
  }, [activeSheetPage, dispatch]);
};
