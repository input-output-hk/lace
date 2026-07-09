import { onlineStatusActions } from '@lace-contract/online-status';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

/**
 * Watches `navigator.onLine` from the popup/tab window context and dispatches
 * `setOffline` to redux. Must run in a UI context, not the MV3 service worker
 * — the SW's `navigator.onLine` reflects OS-level network state and does not
 * follow DevTools network throttling, so detection there is unreliable.
 */
export const useReportOnlineStatus = (): void => {
  const dispatch = useDispatch();

  useEffect(() => {
    const update = () => {
      dispatch(
        onlineStatusActions.onlineStatus.setOffline(!window.navigator.onLine),
      );
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [dispatch]);
};
