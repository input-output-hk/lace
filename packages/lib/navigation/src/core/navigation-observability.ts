import { getObservability, LogLevel } from '@lace-lib/observability';
import { useCallback, useMemo } from 'react';

import type { NavigationState } from '../types';

type NavigatorKind = 'sheet' | 'stack';

type RouteLike = {
  name?: string;
  params?: unknown;
};

type ActiveRoute = {
  name: string;
  params?: unknown;
  navigator: NavigatorKind;
};

type ContainerObservabilityProps = {
  onNavigationReady: () => void;
  onNavigationStateChange: (
    state: Readonly<NavigationState> | undefined,
  ) => void;
};

type NavigationRefLike = {
  getCurrentRoute?: () =>
    | {
        name?: string;
        params?: unknown;
      }
    | undefined;
  getState?: () => Readonly<NavigationState> | undefined;
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

const getActiveRouteFromState = (
  navigationState: Readonly<NavigationState> | undefined,
  navigator: NavigatorKind = 'sheet',
): ActiveRoute | undefined => {
  if (!navigationState?.routes?.length) return undefined;

  const routeIndex = navigationState.index ?? navigationState.routes.length - 1;
  const route = navigationState.routes[routeIndex];
  if (!route) return undefined;

  const nextNavigator =
    navigator === 'sheet' && route.name === 'RootStack' ? 'stack' : navigator;

  const nestedState = route.state as Readonly<NavigationState> | undefined;
  if (nestedState) {
    const nestedRoute = getActiveRouteFromState(nestedState, nextNavigator);
    if (nestedRoute?.name) return nestedRoute;
  }

  return {
    name: route.name,
    params: route.params,
    navigator: nextNavigator,
  };
};

const createNavigationLifecycleTracker = (): {
  onReady: (
    navigationState: Readonly<NavigationState> | undefined,
    route: RouteLike | undefined,
  ) => void;
  onStateChange: (state: Readonly<NavigationState> | undefined) => void;
} => {
  const seenRoutes = new Set<string>();
  const state = {
    previousRouteName: null as string | null,
  };

  const trackDidLoad = (route: ActiveRoute): void => {
    const routeKey = `${route.navigator}:${route.name}`;
    if (seenRoutes.has(routeKey)) return;

    seenRoutes.add(routeKey);
    trackViewLifecycle(route.navigator, 'did_load', route.name);
  };

  const handleRouteChange = (
    route: ActiveRoute | undefined,
    isInitial: boolean,
  ): void => {
    const currentRouteName = route?.name;
    if (!currentRouteName) return;

    trackDidLoad(route);

    const previousRouteName = state.previousRouteName;
    const didRouteChange = previousRouteName !== currentRouteName;

    if (isInitial || didRouteChange) {
      safeAddBreadcrumb('navigation.state_change', 'navigation.state_change', {
        navigator: route.navigator,
        from: previousRouteName,
        to: currentRouteName,
        ...getRouteParamsSummary(route.params),
      });
    }

    state.previousRouteName = currentRouteName;
  };

  return {
    onReady: (navigationState, route) => {
      const activeRoute =
        getActiveRouteFromState(navigationState) ??
        (route?.name
          ? {
              name: route.name,
              params: route.params,
              navigator: 'sheet' as const,
            }
          : undefined);

      handleRouteChange(activeRoute, true);
    },
    onStateChange: navigationState => {
      handleRouteChange(getActiveRouteFromState(navigationState), false);
    },
  };
};

export const useNavigationObservability = (
  navigationRef: NavigationRefLike,
): {
  onNavigationReady: ContainerObservabilityProps['onNavigationReady'];
  onNavigationStateChange: ContainerObservabilityProps['onNavigationStateChange'];
} => {
  const navigationTracker = useMemo(
    () => createNavigationLifecycleTracker(),
    [],
  );

  const onNavigationReady = useCallback(() => {
    navigationTracker.onReady(
      navigationRef.getState?.(),
      navigationRef.getCurrentRoute?.(),
    );
  }, [navigationRef, navigationTracker]);

  const onNavigationStateChange = useCallback(
    (state: Readonly<NavigationState> | undefined) => {
      navigationTracker.onStateChange(state);
    },
    [navigationTracker],
  );

  return {
    onNavigationReady,
    onNavigationStateChange,
  };
};
