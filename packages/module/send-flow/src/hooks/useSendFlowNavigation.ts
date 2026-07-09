import { useSendFlow } from '@lace-contract/send-flow';
import {
  navigationRef,
  NavigationControls,
  SheetRoutes,
} from '@lace-lib/navigation';
import { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../hooks';

import type { NavigateParams } from '@lace-lib/navigation';

/**
 * Sheets that make up the send flow. Keep in sync with the screens registered in
 * `addons/sheetPages.tsx`.
 */
const SEND_FLOW_SHEET_ROUTES = new Set<string>([
  SheetRoutes.Send,
  SheetRoutes.ReviewTransaction,
  SheetRoutes.SendResult,
  SheetRoutes.AddAssets,
  SheetRoutes.AddressBook,
  SheetRoutes.QrScanner,
]);

/** True while at least one send-flow sheet is present in the sheet stack. */
const isAnySendFlowSheetOpen = (): boolean => {
  if (!navigationRef.isReady()) return false;
  return (
    navigationRef
      .getRootState()
      ?.routes.some(route => SEND_FLOW_SHEET_ROUTES.has(route.name)) ?? false
  );
};

/**
 * Reset routine from the most recently mounted send-flow screen, invoked by the
 * singleton watcher. Targets only app-global state (redux + the app-lifetime
 * `SendProvider`), so it stays valid after every send-flow screen has unmounted —
 * which is when the watcher fires it.
 */
// eslint-disable-next-line functional/no-let
let runSendFlowReset: (() => void) | null = null;

/** Whether a send-flow sheet was present at the previous navigation state. */
// eslint-disable-next-line functional/no-let
let isSendFlowStackOpen = false;

/**
 * Navigation container the watcher is currently attached to.
 *
 * A `state` listener added while the container is ready binds straight to that
 * container instance, not to React Navigation's re-attach registry, so it is
 * dropped when the `<NavigationContainer>` remounts (e.g. the Router toggling
 * `isLoading`). Tracking the attached container lets the watcher spot a different
 * live container and re-attach.
 */
// eslint-disable-next-line functional/no-let
let watchedContainer: object | null = null;

/**
 * Subscribe a navigation `state` listener that resets the send flow on the
 * open→closed transition of its sheet stack.
 *
 * Driven by the navigation state stream, not per-screen unmount: a whole-stack
 * interactive dismiss (backdrop tap / swipe-down → close-all cascade) removes
 * routes incrementally while screens unmount in an unrelated order. An unmount-time
 * snapshot therefore often still sees lingering send-flow routes and skips the
 * reset, and an already-unmounted screen never re-checks when its route is finally
 * popped — leaving redux and SendProvider stale after the UI is gone. A single
 * stream listener sees the final empty state regardless of teardown order and
 * fires exactly once.
 *
 * Subscribes once per container and never tears down on screen unmount, so it
 * outlives the last screen to observe the closing event. A `<NavigationContainer>`
 * remount also remounts the send-flow screens; re-running this on mount and
 * re-attaching whenever the live container changed self-heals the subscription.
 */
const ensureSendFlowStackWatcher = (): void => {
  if (!navigationRef.isReady()) return;

  const liveContainer = navigationRef.current;
  if (watchedContainer === liveContainer) return;
  watchedContainer = liveContainer;
  isSendFlowStackOpen = isAnySendFlowSheetOpen();

  navigationRef.addListener('state', () => {
    const isOpenNow = isAnySendFlowSheetOpen();
    const didSendFlowJustClose = isSendFlowStackOpen && !isOpenNow;
    isSendFlowStackOpen = isOpenNow;
    if (didSendFlowJustClose) runSendFlowReset?.();
  });
};

/**
 * Hook to encapsulate navigation and cleanup tracking for ALL send-flow screens.
 * Resets the state machine when the send-flow sheet stack empties — i.e. the user
 * left the flow rather than navigating between its sheets.
 */
export const useSendFlowNavigation = () => {
  const dispatchClosed = useDispatchLaceAction('sendFlow.closed', true);
  const { resetSendFlow } = useSendFlow();

  const navigate = useCallback(
    <T extends SheetRoutes>(...args: NavigateParams<T>) => {
      NavigationControls.navigate(...args);
    },
    [],
  );

  // Point the singleton watcher at this screen's reset callbacks and make sure it
  // is listening. The watcher — not this effect's cleanup — performs the reset, so
  // it survives the screen unmounting mid-teardown.
  useEffect(() => {
    runSendFlowReset = () => {
      dispatchClosed();
      resetSendFlow();
    };
    ensureSendFlowStackWatcher();
  }, [dispatchClosed, resetSendFlow]);

  return { navigate };
};
