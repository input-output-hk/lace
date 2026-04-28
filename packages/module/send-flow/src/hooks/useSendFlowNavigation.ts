import { useSendFlow } from '@lace-contract/send-flow';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../hooks';

import type { SheetRoutes, NavigateParams } from '@lace-lib/navigation';

/**
 * Module-level flag shared across ALL send-flow screens.
 * Set to true when navigating, reset when the destination component mounts.
 */
// eslint-disable-next-line functional/no-let
let isNavigatingWithinSendFlow = false;

/**
 * Hook to encapsulate navigation and cleanup tracking for ALL send-flow screens.
 * Ensures state machine closes reliably when any screen is dismissed.
 */
export const useSendFlowNavigation = () => {
  const dispatchClosed = useDispatchLaceAction('sendFlow.closed', true);
  const { resetSendFlow } = useSendFlow();

  const navigate = useCallback(
    (
      route: SheetRoutes,
      params?: NavigateParams<SheetRoutes>[1],
      options?: NavigateParams<SheetRoutes>[2],
    ) => {
      isNavigatingWithinSendFlow = true;
      NavigationControls.sheets.navigate(route, params, {
        preventCloseOnTransition: true,
        ...options,
      });
    },
    [],
  );

  // Reset navigation flag when component mounts (navigation completed)
  useEffect(() => {
    isNavigatingWithinSendFlow = false;
  }, []);

  useEffect(() => {
    return () => {
      if (!isNavigatingWithinSendFlow) {
        dispatchClosed();
        resetSendFlow();
      }
    };
  }, [dispatchClosed, resetSendFlow]);

  return { navigate };
};
