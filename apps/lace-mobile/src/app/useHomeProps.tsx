import { useAnalytics } from '@lace-contract/analytics';
import { FeatureFlagKey } from '@lace-contract/feature';
import { useTranslation, type TranslationKey } from '@lace-contract/i18n';
import { FeatureIds } from '@lace-contract/network';
import { TabRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { createContextualUseLoadModules } from '@lace-lib/util-render';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { useLaceSelector } from './util/hooks';

import type {
  ActionAppMenuItem,
  NavigationActionAppMenuItem,
} from '@lace-contract/app';
import type { BottomTabBarProps } from '@lace-lib/navigation';
import type {
  LaceButtonBadgeProps,
  Network,
  TabButtonProps,
} from '@lace-lib/ui-toolkit';

const useLoadModules = createContextualUseLoadModules();

type UseHomeProps = {
  tabBarPosition: 'bottom' | 'left';
  networkName: Network;
  buildTabRoutes: (props: BottomTabBarProps) => {
    mainRoutes: TabButtonProps[];
    expandableRoutes: TabButtonProps[];
  };
  laceButtonBadge: LaceButtonBadgeProps | undefined;
};

type SortableTabButtonProps = TabButtonProps & { sortKey: string };

export const useHomeProps = (): UseHomeProps => {
  const { isSideMenu } = useTheme();
  const { trackEvent } = useAnalytics();

  const menuItemsList = useLoadModules('addons.loadTabMenuItems');
  const dispatch = useDispatch();
  const { t } = useTranslation();

  // Check feature availability for restricted features
  const isSwapAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.SWAP_CENTER,
  );
  const isBuyAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.BUY_FLOW,
  );
  const isDappExplorerAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.DAPP_EXPLORER,
  );

  const unreadNotificationsCount = useLaceSelector(
    'notificationCenter.selectUnreadNotificationsCount',
  );
  const loadedFeatures = useLaceSelector('features.selectLoadedFeatures');
  const isNotificationCenterEnabled =
    loadedFeatures?.featureFlags.some(
      flag => flag.key === FeatureFlagKey('NOTIFICATION_CENTER'),
    ) ?? false;
  const networkType = useLaceSelector('network.selectNetworkType');

  const handleMenuItemAction = useCallback(
    (
      menuItemAction:
        | ActionAppMenuItem['action']
        | NavigationActionAppMenuItem['action'],
    ) => {
      if (typeof menuItemAction === 'function') {
        menuItemAction();
      } else {
        dispatch(menuItemAction);
      }
    },
    [dispatch],
  );

  const tabMenuItems = useMemo((): SortableTabButtonProps[] => {
    if (!Array.isArray(menuItemsList)) return [];
    return menuItemsList
      .flatMap(tabMenuItems => tabMenuItems?.menuItems || [])
      .filter(
        (
          menuItem,
        ): menuItem is ActionAppMenuItem | NavigationActionAppMenuItem =>
          menuItem && 'action' in menuItem,
      )
      .filter(menuItem => {
        if (menuItem.id === 'tab-menu-item-sell') return isSwapAvailable;
        if (menuItem.id === 'tab-menu-item-buy') return isBuyAvailable;
        return true;
      })
      .map(menuItem => {
        const IconComponent = menuItem.icons?.Normal;
        return {
          sortKey: menuItem.id,
          label: t(menuItem.label),
          icon: IconComponent ? <IconComponent /> : null,
          onPress: () => {
            trackEvent('home | tab bar | menu item | press', {
              id: menuItem.id,
            });
            handleMenuItemAction(menuItem.action);
          },
          testID: menuItem.id,
          isFocused: false,
          accessibilityLabel: menuItem.label,
          badge: menuItem.badge,
        } satisfies SortableTabButtonProps;
      });
  }, [
    menuItemsList,
    t,
    handleMenuItemAction,
    isSwapAvailable,
    isBuyAvailable,
    trackEvent,
  ]);

  const defaultMenuOrder = useMemo<string[]>(() => {
    return [
      TabRoutes.Portfolio,
      TabRoutes.StakingCenter,
      TabRoutes.DApps,
      TabRoutes.Settings,
      'tab-menu-item-buy',
      'tab-menu-item-send',
      'tab-menu-item-receive',
      TabRoutes.Swaps,
      TabRoutes.AccountCenter,
      TabRoutes.Contacts,
      TabRoutes.Support,
      TabRoutes.IdentityCenter,
      TabRoutes.About,
      TabRoutes.NotificationCenter,
    ];
  }, []);

  const buildTabRoutes = useCallback(
    ({
      state,
      descriptors,
      navigation,
    }: BottomTabBarProps): {
      mainRoutes: TabButtonProps[];
      expandableRoutes: TabButtonProps[];
    } => {
      const focusedRouteKey = state.routes[state.index]?.key;

      const tabRoutes: SortableTabButtonProps[] = state.routes
        .filter(route => {
          if (route.name === (TabRoutes.DApps as string))
            return isDappExplorerAvailable;
          if (route.name === (TabRoutes.Swaps as string))
            return isSwapAvailable;
          return true;
        })
        .map(route => {
          const { options } = descriptors[route.key];
          const { tabBarIcon, tabBarAccessibilityLabel, tabBarBadge } = options;
          const resolvedBadge =
            route.name === (TabRoutes.NotificationCenter as string)
              ? unreadNotificationsCount > 0
                ? String(unreadNotificationsCount)
                : undefined
              : tabBarBadge;

          const icon = tabBarIcon
            ? tabBarIcon({ focused: true, color: '', size: 0 })
            : null;

          const tabBarLabelKey =
            typeof options.tabBarLabel === 'string'
              ? (options.tabBarLabel as TranslationKey)
              : undefined;

          const label = tabBarLabelKey
            ? t(tabBarLabelKey)
            : options.title ?? route.name;

          const onPress = () => {
            trackEvent('home | tab bar | tab | press', { tab: route.name });
            navigation.navigate(route.name);
          };

          const testID = `${route.name.toLowerCase()}-tab-btn`;

          return {
            sortKey: route.name,
            label,
            icon,
            onPress,
            testID,
            isFocused: route.key === focusedRouteKey,
            accessibilityLabel: tabBarAccessibilityLabel ?? label,
            badge: resolvedBadge,
          } satisfies SortableTabButtonProps;
        });

      const orderIndexByLabel = new Map(
        defaultMenuOrder.map((label, index) => [label, index]),
      );

      // Create a single array of tabRoutes + tabMenuItems, ordered by defaultMenuOrder (by label).
      // Items not in defaultMenuOrder are placed at the end, in their original order.
      const orderedRoutes = [...tabRoutes, ...tabMenuItems]
        .map((item, originalIndex) => ({ item, originalIndex }))
        .sort((a, b) => {
          const aOrder = orderIndexByLabel.get(a.item.sortKey);
          const bOrder = orderIndexByLabel.get(b.item.sortKey);

          const aRank = aOrder ?? Number.POSITIVE_INFINITY;
          const bRank = bOrder ?? Number.POSITIVE_INFINITY;

          if (aRank !== bRank) return aRank - bRank;
          return a.originalIndex - b.originalIndex;
        })
        .map(({ item }) => item)
        .map(({ sortKey: _sortKey, ...tabButtonProps }) => tabButtonProps);

      // Return the first 4 routes as mainRoutes and the rest as expandableRoutes
      const mainRoutes = orderedRoutes.slice(0, 4);
      const expandableRoutes = orderedRoutes.slice(4);

      return { mainRoutes, expandableRoutes };
    },
    [
      defaultMenuOrder,
      tabMenuItems,
      t,
      isDappExplorerAvailable,
      isSwapAvailable,
      unreadNotificationsCount,
      trackEvent,
    ],
  );

  const laceButtonBadge = useMemo(() => {
    return isNotificationCenterEnabled && unreadNotificationsCount > 0
      ? {
          badge: String(unreadNotificationsCount),
          badgeColor: 'negative' as const,
        }
      : undefined;
  }, [isNotificationCenterEnabled, unreadNotificationsCount]);

  return {
    tabBarPosition: isSideMenu ? 'left' : 'bottom',
    networkName: networkType,
    buildTabRoutes,
    laceButtonBadge,
  };
};
