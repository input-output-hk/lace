import { Platform, Keyboard } from 'react-native';

import { trackNavigationAction } from './navigation-observability';
import { setNavigatingSheet } from './sheetNavigator';

import { sheetRef, sheetNavigationRef } from './index';

import type { NavigateParams, SheetParameterList } from '../types';
import type { SheetRoutes } from '../types/routes';

// Track pending expand RAF so it can be cancelled if close() is called
const pendingExpandRaf = { id: null as number | null };

type SheetCloseListener = () => void;
const closeListeners = new Set<SheetCloseListener>();

/** Register a callback that fires when the sheet is closed. Returns unsubscribe. */
export const onSheetClose = (listener: SheetCloseListener): (() => void) => {
  closeListeners.add(listener);
  return () => {
    closeListeners.delete(listener);
  };
};

export const SheetControls = {
  getCurrentRoute: (): string | undefined => {
    if (!sheetNavigationRef.isReady()) return undefined;
    return sheetNavigationRef.getCurrentRoute()?.name;
  },

  expand: (): void => {
    trackNavigationAction('sheetExpand', {
      navigator: 'sheet',
      from: SheetControls.getCurrentRoute(),
    });

    if (sheetRef.current) {
      // Set isOpen synchronously so navigate() can correctly determine push vs reset
      sheetRef.current.isOpen = true;
      // Cancel any pending expand to avoid stacking RAF callbacks
      if (pendingExpandRaf.id !== null) {
        cancelAnimationFrame(pendingExpandRaf.id);
      }
      // Defer actual expand to next frame to ensure content is rendered
      // Note: If close() is called before this fires, it will cancel this RAF
      pendingExpandRaf.id = requestAnimationFrame(() => {
        pendingExpandRaf.id = null;
        if (sheetRef.current) {
          sheetRef.current.expand();
        }
      });
    }
  },

  close: (): void => {
    trackNavigationAction('sheetClose', {
      navigator: 'sheet',
      from: SheetControls.getCurrentRoute(),
    });

    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }

    // Cancel any pending expand RAF to prevent reopening after close
    if (pendingExpandRaf.id !== null) {
      cancelAnimationFrame(pendingExpandRaf.id);
      pendingExpandRaf.id = null;
    }
    // Notify listeners before resetting — hooks use this to reject pending
    // dApp requests when the sheet is dismissed by the user.
    for (const listener of closeListeners) {
      listener();
    }

    if (sheetRef.current) {
      sheetRef.current.isOpen = false;
      // Reset navigation BEFORE closing to prevent iOS gesture handler crashes.
      // By resetting first, the content changes to Initial (empty) before the
      // close animation starts, so there are no gesture handlers to crash.
      if (sheetNavigationRef.isReady()) {
        sheetNavigationRef.reset({
          index: 0,
          routes: [{ name: 'Initial' as keyof SheetParameterList }],
        });
      }
      sheetRef.current.close();
    }
  },

  isOpen: (): boolean => {
    if (!sheetRef.current) return false;
    // Explicitly check for true to handle undefined case
    return sheetRef.current.isOpen === true;
  },

  navigate: <T extends SheetRoutes>(
    ...[route, params, options]: NavigateParams<T>
  ): void => {
    trackNavigationAction('sheetNavigate', {
      navigator: 'sheet',
      route,
      hasParams: params !== undefined,
      hasOptions: options !== undefined,
      from: SheetControls.getCurrentRoute(),
    });

    const resetToRoute = (): void => {
      if (!sheetNavigationRef.isReady()) return;

      const newParams = { preventAnimation: true, ...params };

      const resetRoute = {
        name: route as keyof SheetParameterList,
        params: newParams,
      };

      sheetNavigationRef.reset({
        index: 0,
        routes: [resetRoute],
      });
    };

    const navigateToRoute = (): void => {
      if (!sheetNavigationRef.isReady()) return;

      const newParams = { preventAnimation: true, ...params };

      const navigationAction = {
        name: route as keyof SheetParameterList,
        params: newParams,
        ...(options && { merge: options.merge, pop: options.pop }),
      };

      sheetNavigationRef.navigate(
        navigationAction as Parameters<typeof sheetNavigationRef.navigate>[0],
      );
    };

    const ensureSheetIsOpen = (): void => {
      if (!SheetControls.isOpen()) {
        SheetControls.expand();
      }
    };

    // Determine if we should reset or navigate
    // - If sheet is closed: always reset (fresh start)
    // - If sheet is open: use navigate (push) to avoid content replacement race condition
    // - options.reset can override this behavior
    const isSheetCurrentlyOpen = SheetControls.isOpen();
    const shouldReset =
      options?.reset === true ||
      (options?.reset !== false && !isSheetCurrentlyOpen);

    // Set navigation flag to prevent sheet from closing during content transition
    // This is opt-in via the preventCloseOnTransition option
    const shouldPreventClose = options?.preventCloseOnTransition === true;
    if (shouldPreventClose) {
      setNavigatingSheet(true);
    }

    if (shouldReset) {
      resetToRoute();
      ensureSheetIsOpen();
    } else {
      ensureSheetIsOpen();
      navigateToRoute();
    }

    // Clear navigation flag after a delay to allow content transition to complete
    if (shouldPreventClose) {
      setTimeout(() => {
        setNavigatingSheet(false);
      }, 500);
    }
  },
};
