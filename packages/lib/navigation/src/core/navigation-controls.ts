import { CommonActions, StackActions } from '@react-navigation/native';

import { SheetRoutes, StackRoutes } from '../types/routes';

import { trackNavigationAction } from './navigation-observability';

import { navigationRef } from '.';

import type {
  SheetNavigationOptions,
  SheetParameterList,
  StackParameterList,
} from '../types';
import type {
  NavigationContainerRef,
  NavigationState,
} from '@react-navigation/native';

type NavigationOptions = {
  merge?: boolean;
  pop?: boolean;
  reset?: boolean;
  preventCloseOnTransition?: boolean;
};

type AppRoutes = SheetRoutes | StackRoutes;

type RouteParams<T extends AppRoutes> = T extends SheetRoutes
  ? SheetParameterList[T]
  : T extends StackRoutes
  ? StackParameterList[T]
  : never;

export type NavigateParams<T extends AppRoutes> = [
  route: T,
  params?: RouteParams<T>,
  options?: NavigationOptions | SheetNavigationOptions,
];

const getMainNavigation =
  (): NavigationContainerRef<SheetParameterList> | null => {
    return navigationRef?.isReady() ? navigationRef : null;
  };

const isStackRoute = (route: AppRoutes): route is StackRoutes =>
  route in StackRoutes;

const isSheetRoute = (route: string | undefined): route is SheetRoutes =>
  !!route && route in SheetRoutes;

const isInsideSheet = (currentRoute: AppRoutes | undefined): boolean =>
  isSheetRoute(currentRoute) && currentRoute !== SheetRoutes.RootStack;

// Singleton tracker for the in-flight sheet dismissal. A newer navigation
// intent supersedes any pending one, ensuring at most one state listener.
// eslint-disable-next-line functional/no-let
let activeDismissal: { cancel: () => void } | null = null;

const dismissSheetsAndThen = (
  navigation: NavigationContainerRef<SheetParameterList>,
  action: () => void,
): void => {
  // Supersede any previous pending dismissal (drops its stale action and
  // unsubscribes its listener).
  activeDismissal?.cancel();

  const rootState = navigation.getRootState() as NavigationState | undefined;

  // No sheets above the base route — nothing to dismiss.
  if (!rootState || rootState.routes.length <= 1) {
    action();
    return;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  let settled = false;

  const finalize = (fireAction: boolean) => {
    if (settled) return;
    settled = true;
    unsubscribe();
    if (activeDismissal === handle) activeDismissal = null;
    if (fireAction) action();
  };

  const handle = {
    cancel: () => {
      finalize(false);
    },
  };

  // Resolve only on natural dismissal (routes.length <= 1). No timeout
  // fallback: a late action() would crash by hitting a stale React tree.
  const unsubscribe = navigation.addListener('state', event => {
    const newState = event.data.state as NavigationState | undefined;
    if (!newState || newState.routes.length <= 1) {
      finalize(true);
    }
  });

  activeDismissal = handle;

  // popToTop marks the bottom-most sheet route with closing: true.
  // TrueSheetScreen reacts to that flag by invoking the native dismiss(),
  // and the native dismissal cascade tears down any nested sheets too.
  // Once the native onDidDismiss event arrives, the router dispatches REMOVE
  // and state.routes shrinks back to [baseRoute], which is what our listener waits for.
  navigation.dispatch(StackActions.popToTop());
};

const sheetCloseListeners = new Set<() => void>();

const notifySheetCloseListeners = (): void => {
  sheetCloseListeners.forEach(listener => {
    listener();
  });
};

export const onSheetClose = (listener: () => void): (() => void) => {
  sheetCloseListeners.add(listener);

  return () => {
    sheetCloseListeners.delete(listener);
  };
};

/** Last index of `routeName` in the root stack `routes` (sheet navigator). */
export const findLastRouteIndexByName = (
  state: NavigationState | undefined,
  routeName: string,
): number => {
  if (!state?.routes?.length) return -1;
  for (let index = state.routes.length - 1; index >= 0; index--) {
    const route = state.routes[index];
    if (route?.name === routeName) return index;
  }
  return -1;
};

const countDismissibleSheetRoutes = (
  state: NavigationState | undefined,
): number => {
  if (!state?.routes?.length) return 0;

  return state.routes.filter(
    route => isSheetRoute(route.name) && route.name !== SheetRoutes.RootStack,
  ).length;
};

const mergeSheetRouteParams = (
  existing: unknown,
  incoming: Record<string, unknown>,
): Record<string, unknown> => {
  const existingObject =
    existing !== undefined &&
    typeof existing === 'object' &&
    !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...existingObject, ...incoming };
};

const setParamsWhenRouteFocused = (
  routeName: AppRoutes,
  params: Record<string, unknown>,
): void => {
  const navigation = getMainNavigation();
  if (!navigation) return;

  const applyParams = () => {
    const nav = getMainNavigation();
    if (!nav) return false;
    if (nav.getCurrentRoute()?.name !== routeName) return false;
    nav.dispatch(CommonActions.setParams(params));
    return true;
  };

  if (applyParams()) return;

  const unsubscribe = navigation.addListener('state', () => {
    if (!applyParams()) return;
    unsubscribe();
  });
};

type NavigateStrategy = 'popToExisting' | 'push' | 'setParamsOnly';

export const NavigationControls = {
  navigate: <T extends AppRoutes>(
    ...[route, params, options]: NavigateParams<T>
  ): void => {
    const navigation = getMainNavigation();
    if (!navigation) return;

    const clonedParams =
      params && typeof params === 'object' ? { ...params } : params;

    const currentRoute = navigation.getCurrentRoute()?.name;
    let strategy: NavigateStrategy = 'push';

    if (!isStackRoute(route)) {
      // A sheet dismissal is still settling; presenting now lands in the
      // closing route and is swallowed. Defer until the cascade settles, then
      // present fresh — dismissSheetsAndThen clears activeDismissal first, so
      // this recurses without re-deferring.
      if (activeDismissal) {
        dismissSheetsAndThen(navigation, () => {
          NavigationControls.navigate(route, params, options);
        });
        return;
      }

      const rootState = navigation.getRootState() as
        | NavigationState
        | undefined;
      const targetIndex = findLastRouteIndexByName(rootState, route);
      const currentIndex = rootState?.index ?? 0;

      if (rootState?.routes?.length && targetIndex !== -1) {
        const targetRoute = rootState.routes[targetIndex];
        const paramsRecord =
          clonedParams !== undefined &&
          typeof clonedParams === 'object' &&
          !Array.isArray(clonedParams)
            ? (clonedParams as Record<string, unknown>)
            : undefined;

        if (targetIndex === currentIndex) {
          strategy = 'setParamsOnly';
          if (paramsRecord === undefined) {
            return;
          }
          const merged = mergeSheetRouteParams(
            targetRoute.params,
            paramsRecord,
          );
          trackNavigationAction('navigate', {
            navigator: 'SheetStack',
            route,
            hasParams: params !== undefined,
            hasOptions: options !== undefined,
            from: currentRoute,
            strategy,
          });
          if (isSheetRoute(currentRoute)) {
            notifySheetCloseListeners();
          }
          navigation.dispatch(CommonActions.setParams(merged));
          return;
        }

        if (targetIndex < currentIndex) {
          strategy = 'popToExisting';
          const popCount = currentIndex - targetIndex;
          const merged =
            paramsRecord !== undefined
              ? mergeSheetRouteParams(targetRoute.params, paramsRecord)
              : undefined;

          trackNavigationAction('navigate', {
            navigator: 'SheetStack',
            route,
            hasParams: params !== undefined,
            hasOptions: options !== undefined,
            from: currentRoute,
            strategy,
          });
          if (isSheetRoute(currentRoute)) {
            notifySheetCloseListeners();
          }

          navigation.dispatch(StackActions.pop(popCount));

          if (merged !== undefined) {
            setParamsWhenRouteFocused(route, merged);
          }
          return;
        }
      }
    }

    trackNavigationAction('navigate', {
      navigator: 'SheetStack',
      route,
      hasParams: params !== undefined,
      hasOptions: options !== undefined,
      from: currentRoute,
      strategy,
    });
    if (isSheetRoute(currentRoute)) {
      notifySheetCloseListeners();
    }

    if (isStackRoute(route)) {
      const navigationAction = {
        name: SheetRoutes.RootStack as keyof SheetParameterList,
        params: {
          screen: route,
          ...(clonedParams !== undefined ? { params: clonedParams } : {}),
        } as SheetParameterList[SheetRoutes.RootStack],
        ...options,
      };

      const performNavigate = () => {
        navigation.navigate(
          navigationAction as Parameters<typeof navigation.navigate>[0],
        );
      };

      // When navigating to a stack route from inside a sheet, the SheetStack's
      // base StackRouter only updates state.index — the sheet route stays in
      // state.routes with closing: false, so the native UIPresentationController
      // (iOS) / BottomSheetBehavior (Android) is never asked to dismiss. The
      // stack push happens but is occluded by the still-presented modal.
      // Explicitly dismiss any active sheets and wait for the native dismissal
      // to be reflected in state before issuing the navigate.
      if (isInsideSheet(currentRoute as AppRoutes | undefined)) {
        dismissSheetsAndThen(navigation, performNavigate);
        return;
      }

      performNavigate();
      return;
    }

    const navigationAction = {
      name: route,
      ...(clonedParams !== undefined ? { params: clonedParams } : {}),
      ...options,
    };

    navigation.navigate(
      navigationAction as Parameters<typeof navigation.navigate>[0],
    );
  },
  closeSheet: () => {
    const navigation = getMainNavigation();
    if (!navigation) return;

    const rootState = navigation.getRootState() as NavigationState | undefined;
    const sheetRouteCount = countDismissibleSheetRoutes(rootState);

    if (sheetRouteCount === 0) return;

    notifySheetCloseListeners();
    // Route through the same settle-and-wait used when navigating out of a
    // sheet. A bare pop returns immediately, so navigation observers see the
    // route advance while TrueSheet is still running its dismissal cascade
    // (onDidDismiss → REMOVE) — the sheet view lags the route change.
    // dismissSheetsAndThen treats the dismissal as settled only once the
    // cascade has shrunk the stack back to the base route, and supersedes any
    // in-flight dismissal so consecutive closes can't leave a stale listener
    // firing a stale action.
    dismissSheetsAndThen(navigation, () => undefined);
  },
};

type SheetStateRoute = NavigationState['routes'][number] & {
  closing?: boolean;
};

/**
 * Handle a sheet's `sheetWillDismiss` event to tell an *interactive* dismissal
 * (backdrop tap / swipe-down) apart from a *programmatic* one (a button
 * dispatching goBack/pop, or closeSheet/Done).
 *
 * Interactively dismissing a stacked sheet closes the whole sheet stack down to
 * the base route, on every platform, rather than revealing the sheet beneath
 * it (TrueSheet's native single-sheet default).
 *
 * The TrueSheet router marks a route with `closing: true` before issuing the
 * native dismiss for every programmatic dismissal. An interactive dismissal is
 * driven natively, so the route is never marked. That flag is the discriminator:
 *
 * - `closing` set        → explicit intent (e.g. "Back" to the previous sheet);
 *                          honour it and let the single sheet pop.
 * - a cascade is running  → closeSheet/Done already marked the bottom sheet
 *                          `closing`; the native dismissal tears down the rest.
 * - otherwise            → backdrop tap / swipe-down with no intent; close the
 *                          whole sheet stack.
 */
export const handleInteractiveSheetDismiss = (
  routeKey: string | undefined,
): void => {
  if (!routeKey) return;

  const navigation = getMainNavigation();
  if (!navigation) return;

  const rootState = navigation.getRootState() as NavigationState | undefined;
  if (!rootState?.routes?.length) return;

  const dismissingRoute = rootState.routes.find(
    route => route.key === routeKey,
  ) as SheetStateRoute | undefined;
  if (!dismissingRoute) return;

  // Programmatic dismiss (button → goBack/pop): route pre-marked `closing`.
  if (dismissingRoute.closing) return;

  // A close-all cascade is already running (closeSheet/Done marked the
  // bottom-most sheet `closing`); the native dismissal tears down the rest.
  const isCascadeInProgress = rootState.routes.some(
    route => isSheetRoute(route.name) && (route as SheetStateRoute).closing,
  );
  if (isCascadeInProgress) return;

  // Interactive dismiss with no preceding intent (backdrop tap / swipe-down).
  // Closing the only sheet already returns to the base route — nothing to do.
  if (countDismissibleSheetRoutes(rootState) <= 1) return;

  NavigationControls.closeSheet();
};

/**
 * Screen listeners for the app's `SheetStack.Navigator`. Wiring `sheetWillDismiss`
 * to {@link handleInteractiveSheetDismiss} is what turns an interactive backdrop
 * dismiss into a whole-stack close. Shared by every platform's Router so the
 * behaviour can't drift between them, and unit-testable in isolation.
 */
/**
 * Last reported on-screen Y position (dp) per presented sheet, keyed by route
 * key, sourced from the TrueSheet navigator's `sheetPositionChange` events.
 * On Android's new architecture, measurement APIs resolve from the shadow
 * tree and don't account for where TrueSheet natively positions the sheet;
 * overlay components (e.g. ui-toolkit's DropdownMenu Modal) offset their
 * measured anchors by the focused sheet's position.
 */
const sheetPositionsByRouteKey = new Map<string, number>();

export const getFocusedSheetPosition = (): number | undefined => {
  const routeKey = navigationRef.current?.getCurrentRoute()?.key;
  return routeKey === undefined
    ? undefined
    : sheetPositionsByRouteKey.get(routeKey);
};

export const sheetStackScreenListeners = {
  sheetDidDismiss: (event: { target?: string }): void => {
    if (event.target !== undefined) {
      sheetPositionsByRouteKey.delete(event.target);
    }
  },
  sheetPositionChange: (event: {
    target?: string;
    data?: { position?: number };
  }): void => {
    if (
      event.target !== undefined &&
      typeof event.data?.position === 'number'
    ) {
      sheetPositionsByRouteKey.set(event.target, event.data.position);
    }
  },
  sheetWillDismiss: (event: { target?: string }): void => {
    handleInteractiveSheetDismiss(event.target);
  },
};
