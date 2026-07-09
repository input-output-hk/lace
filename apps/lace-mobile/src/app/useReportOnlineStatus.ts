import type { AppStateStatus } from 'react-native';

import { onlineStatusActions } from '@lace-contract/online-status';
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDispatch } from 'react-redux';

import type { NetInfoState } from '@react-native-community/netinfo';

const computeIsOffline = (state: NetInfoState): boolean => {
  // Use `isConnected` only. `isInternetReachable` relies on an internal probe
  // (default `https://clients3.google.com/generate_204`) that can stay
  // `false` after a reconnect on iOS if the probe URL is unreachable or the
  // probe hasn't re-fired yet — which would keep the offline pill stuck on
  // after the user re-joined Wi-Fi. Captive portals / no-internet networks
  // are surfaced separately by provider request failures.
  return state.isConnected === false;
};

/**
 * Watches connectivity via `@react-native-community/netinfo` and dispatches
 * `setOffline` to redux.
 *
 * Belt-and-braces: also force-refreshes on `AppState` transitions back to
 * `active`. iOS occasionally drops the reachability event after Wi-Fi
 * reconnects (more common on simulator), so a manual refresh on foreground
 * recovers the correct state when the user returns to the app.
 */
export const useReportOnlineStatus = (): void => {
  const dispatch = useDispatch();

  useEffect(() => {
    const apply = (state: NetInfoState) => {
      dispatch(
        onlineStatusActions.onlineStatus.setOffline(computeIsOffline(state)),
      );
    };

    void NetInfo.fetch().then(apply);
    const unsubscribe = NetInfo.addEventListener(apply);

    const handleAppState = (status: AppStateStatus) => {
      if (status !== 'active') return;
      void NetInfo.refresh().then(apply);
    };
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppState,
    );

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [dispatch]);
};
