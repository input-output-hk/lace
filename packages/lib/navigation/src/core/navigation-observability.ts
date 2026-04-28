import { getObservability, LogLevel } from '@lace-lib/observability';
import { useCallback, useMemo } from 'react';

import type { NavigationState } from '../types';

type NavigatorKind = 'sheet' | 'stack';

type RouteLike = {
  name?: string;
  params?: unknown;
};

type ScreenListeners = {
  focus: () => void;
  blur: () => void;
  transitionStart?: (event: { data?: { closing?: boolean } }) => void;
};

type ScreenListenersFactory = (args: {
  route: {
    name: string;
    params?: unknown;
  };
}) => ScreenListeners;

type ContainerObservabilityProps = {
  onReady: () => void;
  onStateChange: (state: Readonly<NavigationState> | undefined) => void;
};

type NavigationRefLike = {
  getCurrentRoute?: () =>
    | {
        name?: string;
        params?: unknown;
      }
    | undefined;
};

const safeAddBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, unknown>,
): void => {
  try {
    const observability = getObservability();
    observability.addBreadcrumb({
      message,
      category,
      level: LogLevel.INFO,
      data,
    });
  } catch {
    // Observability can be disabled/uninitialized in some environments.
  }
};

const getRouteParamsSummary = (
  params: unknown,
): Record<string, unknown> | undefined => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return undefined;
  }

  const keys = Object.keys(params).slice(0, 10);
  return {
    paramCount: Object.keys(params).length,
    paramKeys: keys,
  };
};

const trackViewLifecycle = (
  navigator: NavigatorKind,
  event: string,
  routeName: string,
): void => {
  safeAddBreadcrumb(`navigation.view.${event}`, `navigation.view.${event}`, {
    navigator,
    route: routeName,
  });
};

export const trackNavigationAction = (
  action: string,
  data?: Record<string, unknown>,
): void => {
  safeAddBreadcrumb('navigation.action', 'navigation.action', {
    action,
    ...data,
  });
};

const createNavigationLifecycleTracker = (
  navigator: NavigatorKind,
): {
  onReady: (route: RouteLike | undefined) => void;
  onStateChange: (state: Readonly<NavigationState> | undefined) => void;
  createScreenListeners: (withTransitions?: boolean) => ScreenListenersFactory;
} => {
  const seenRoutes = new Set<string>();
  const state = {
    previousRouteName: null as string | null,
  };

  const trackDidLoad = (routeName: string): void => {
    if (seenRoutes.has(routeName)) return;
    seenRoutes.add(routeName);
    trackViewLifecycle(navigator, 'did_load', routeName);
  };

  const handleRouteChange = (
    route: RouteLike | undefined,
    isInitial: boolean,
  ): void => {
    const currentRouteName = route?.name;
    if (!currentRouteName) return;

    trackDidLoad(currentRouteName);

    const previousRouteName = state.previousRouteName;
    const didRouteChange = previousRouteName !== currentRouteName;

    if (isInitial || didRouteChange) {
      safeAddBreadcrumb('navigation.state_change', 'navigation.state_change', {
        navigator,
        from: previousRouteName,
        to: currentRouteName,
        ...getRouteParamsSummary(route?.params),
      });
    }

    state.previousRouteName = currentRouteName;
  };

  const getCurrentRouteFromState = (
    navigationState: Readonly<NavigationState> | undefined,
  ): RouteLike | undefined => {
    if (!navigationState?.routes?.length) return undefined;

    const routeIndex =
      navigationState.index ?? navigationState.routes.length - 1;
    const route = navigationState.routes[routeIndex];
    if (!route) return undefined;

    const nestedState = route.state as Readonly<NavigationState> | undefined;
    if (nestedState) {
      const nestedRoute = getCurrentRouteFromState(nestedState);
      if (nestedRoute?.name) return nestedRoute;
    }

    return { name: route.name, params: route.params };
  };

  const createScreenListeners =
    (withTransitions = false): ScreenListenersFactory =>
    ({ route }) => {
      const routeName = route.name;

      return {
        focus: () => {
          trackDidLoad(routeName);
          trackViewLifecycle(navigator, 'did_appear', routeName);
        },
        blur: () => {
          trackViewLifecycle(navigator, 'did_disappear', routeName);
        },
        ...(withTransitions
          ? {
              transitionStart: (event: { data?: { closing?: boolean } }) => {
                const isClosing = event?.data?.closing === true;
                trackViewLifecycle(
                  navigator,
                  isClosing ? 'will_disappear' : 'will_appear',
                  routeName,
                );
              },
            }
          : {}),
      };
    };

  return {
    onReady: route => {
      handleRouteChange(route, true);
    },
    onStateChange: navigationState => {
      const route = getCurrentRouteFromState(navigationState);
      handleRouteChange(route, false);
    },
    createScreenListeners,
  };
};

export const useNavigationObservability = (
  stackNavigationRef: NavigationRefLike,
  sheetNavigatorRef: NavigationRefLike,
): {
  stackContainerProps: ContainerObservabilityProps;
  sheetContainerProps: ContainerObservabilityProps;
  stackScreenListeners: ReturnType<
    ReturnType<typeof createNavigationLifecycleTracker>['createScreenListeners']
  >;
  sheetScreenListeners: ReturnType<
    ReturnType<typeof createNavigationLifecycleTracker>['createScreenListeners']
  >;
} => {
  const stackNavigationTracker = useMemo(
    () => createNavigationLifecycleTracker('stack'),
    [],
  );
  const sheetNavigationTracker = useMemo(
    () => createNavigationLifecycleTracker('sheet'),
    [],
  );

  const stackScreenListeners = useMemo(
    () => stackNavigationTracker.createScreenListeners(true),
    [stackNavigationTracker],
  );
  const sheetScreenListeners = useMemo(
    () => sheetNavigationTracker.createScreenListeners(),
    [sheetNavigationTracker],
  );

  const handleStackReady = useCallback(() => {
    stackNavigationTracker.onReady(stackNavigationRef.getCurrentRoute?.());
  }, [stackNavigationRef, stackNavigationTracker]);
  const handleStackStateChange = useCallback(
    (state: Readonly<NavigationState> | undefined) => {
      stackNavigationTracker.onStateChange(state);
    },
    [stackNavigationTracker],
  );
  const handleSheetReady = useCallback(() => {
    sheetNavigationTracker.onReady(sheetNavigatorRef.getCurrentRoute?.());
  }, [sheetNavigationTracker, sheetNavigatorRef]);
  const handleSheetStateChange = useCallback(
    (state: Readonly<NavigationState> | undefined) => {
      sheetNavigationTracker.onStateChange(state);
    },
    [sheetNavigationTracker],
  );

  return {
    stackContainerProps: {
      onReady: handleStackReady,
      onStateChange: handleStackStateChange,
    },
    sheetContainerProps: {
      onReady: handleSheetReady,
      onStateChange: handleSheetStateChange,
    },
    stackScreenListeners,
    sheetScreenListeners,
  };
};
