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

  const portfolioActions = useMemo<PortfolioActionsResult>(
    () => ({
      onBuyPress: isBuyAvailable
        ? () => {
            NavigationControls.sheets.navigate(SheetRoutes.Buy);
          }
        : undefined,
      onSendPress: () => {
        NavigationControls.sheets.navigate(SheetRoutes.Send);
      },
      onReceivePress: () => {
        NavigationControls.sheets.navigate(SheetRoutes.Receive);
      },
      onAccountsPress: () => {
        NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
          screen: TabRoutes.AccountCenter,
        });
      },
      onSwapPress: isSwapAvailable
        ? () => {
            NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
              screen: TabRoutes.Swaps,
            });
          }
        : undefined,
    }),
    [isBuyAvailable, isSwapAvailable],
  );

  const createSendAction = useMemo(
    () => (accountId: AccountId) => () => {
      NavigationControls.sheets.navigate(SheetRoutes.Send, {
        accountId,
      });
    },
    [],
  );

  const createAccountsAction = useMemo(
    () => () => () => {
      NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
        screen: TabRoutes.AccountCenter,
      });
    },
    [],
  );

  return {
    portfolioActions,
    createSendAction,
    createAccountsAction,
  };
};
