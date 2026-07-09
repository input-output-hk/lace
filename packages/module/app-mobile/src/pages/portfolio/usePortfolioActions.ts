import { useAnalytics } from '@lace-contract/analytics';
import { FeatureIds } from '@lace-contract/network';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { useMemo } from 'react';

import { useLaceSelector } from '../../hooks';

import type { AccountId } from '@lace-contract/wallet-repo';

export interface PortfolioActionsResult {
  onBuyPress: (() => void) | undefined;
  onSendPress: () => void;
  onReceivePress: () => void;
  onAccountsPress: () => void;
}

interface UsePortfolioActionsReturn {
  portfolioActions: PortfolioActionsResult;
  createSendAction: (accountId: AccountId) => () => void;
  createAccountsAction: () => () => void;
}

export const usePortfolioActions = (): UsePortfolioActionsReturn => {
  const isBuyAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.BUY_FLOW,
  );

  const isSwapAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.SWAP_CENTER,
  );

  const { trackEvent } = useAnalytics();

  const portfolioActions = useMemo<PortfolioActionsResult>(
    () => ({
      onBuyPress: isBuyAvailable
        ? () => {
            trackEvent('portfolio | buy | press');
            NavigationControls.navigate(SheetRoutes.Buy);
          }
        : undefined,
      onSendPress: () => {
        trackEvent('portfolio | send | press');
        NavigationControls.navigate(SheetRoutes.Send);
      },
      onReceivePress: () => {
        trackEvent('portfolio | receive | press');
        NavigationControls.navigate(SheetRoutes.Receive);
      },
      onAccountsPress: () => {
        trackEvent('portfolio | view accounts | press');
        NavigationControls.navigate(StackRoutes.Home, {
          screen: TabRoutes.AccountCenter,
        });
      },
      onSwapPress: isSwapAvailable
        ? () => {
            NavigationControls.navigate(StackRoutes.Home, {
              screen: TabRoutes.Swaps,
            });
          }
        : undefined,
    }),
    [isBuyAvailable, isSwapAvailable, trackEvent],
  );

  const createSendAction = useMemo(
    () => (accountId: AccountId) => () => {
      trackEvent('portfolio | send | press');
      NavigationControls.navigate(SheetRoutes.Send, {
        accountId,
      });
    },
    [trackEvent],
  );

  const createAccountsAction = useMemo(
    () => () => () => {
      trackEvent('portfolio | view accounts | press');
      NavigationControls.navigate(StackRoutes.Home, {
        screen: TabRoutes.AccountCenter,
      });
    },
    [trackEvent],
  );

  return {
    portfolioActions,
    createSendAction,
    createAccountsAction,
  };
};
