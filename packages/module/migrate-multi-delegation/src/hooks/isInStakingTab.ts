import { navigationRef, TabRoutes } from '@lace-lib/navigation';
import { useEffect, useState } from 'react';

/**
 * Hook to detect if the user is currently on the staking tab.
 * Uses navigationRef directly instead of useNavigation() so it can be used
 * outside of NavigationContainer (e.g., in global overlays).
 */
export const useIsInStakingTab = () => {
  const [isInStakingPage, setIsInStakingPage] = useState(false);

  useEffect(() => {
    const trySetupListener = (): (() => void) | undefined => {
      const navigation = navigationRef.current;
      if (!navigation) return undefined;

      // Use getCurrentRoute() to resolve the deepest focused route across
      // nested navigators. Walking state.routes with findIndex is unsafe when
      // the stack contains duplicate Home entries (e.g., after wallet removal
      // navigates to Home while another Home is still in the stack) — it would
      // read nested tab state from the wrong Home instance.
      const checkState = (): void => {
        const currentRouteName = navigation.getCurrentRoute()?.name;
        setIsInStakingPage(currentRouteName === TabRoutes.StakingCenter);
      };

      // Check current state immediately — on Android the component may mount
      // after navigation has already settled, so no 'state' event fires
      checkState();
      navigation.addListener('state', checkState);
      return () => {
        navigation.removeListener('state', checkState);
      };
    };

    let removeListener = trySetupListener();

    if (!removeListener) {
      // navigationRef.current not yet available — on Android the global overlay
      // can mount before NavigationContainer finishes initializing the ref,
      // so we poll until it is ready
      const interval = setInterval(() => {
        removeListener = trySetupListener();
        if (removeListener) clearInterval(interval);
      }, 50);

      return () => {
        clearInterval(interval);
        removeListener?.();
      };
    }

    return removeListener;
  }, []);

  return isInStakingPage;
};
