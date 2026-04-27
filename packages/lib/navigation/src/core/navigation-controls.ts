import { Platform, Keyboard } from 'react-native';

import { trackNavigationAction } from './navigation-observability';
import { SheetControls } from './sheet-controls';

import { navigationRef } from '.';

import type { StackParameterList } from '../types';
import type { StackRoutes } from '../types/routes';
import type { NavigationContainerRef } from '@react-navigation/native';

type NavigationOptions = {
  merge?: boolean;
  pop?: boolean;
};

type NavigateParams<T extends StackRoutes> =
  StackParameterList[T] extends undefined
    ? [route: T, params?: undefined, options?: NavigationOptions]
    : [route: T, params: StackParameterList[T], options?: NavigationOptions];

const getMainNavigation =
  (): NavigationContainerRef<StackParameterList> | null => {
    return navigationRef?.isReady() ? navigationRef : null;
  };

export const NavigationControls = {
  sheets: SheetControls,
  actions: {
    closeAndNavigate: <T extends StackRoutes>(
      ...[route, params, options]: NavigateParams<T>
    ): void => {
      SheetControls.close();
      if (Platform.OS !== 'web') {
        Keyboard.dismiss();
      }
      const navigation = getMainNavigation();
      trackNavigationAction('closeAndNavigate', {
        navigator: 'stack',
        route,
        hasParams: params !== undefined,
        hasOptions: options !== undefined,
        from: navigation?.getCurrentRoute()?.name,
      });

      if (navigation) {
        if (params !== undefined) {
          // Shallow-clone params to ensure React Navigation can define
          // Symbol(CONSUMED_PARAMS) on the object. Redux Toolkit (Immer) freezes
          // all state objects, making them non-extensible.
          const clonedParams = { ...params } as StackParameterList[T];
          const navigationAction = {
            name: route as keyof StackParameterList,
            params: clonedParams,
            ...(options && options),
          };
          navigation.navigate(
            navigationAction as Parameters<typeof navigation.navigate>[0],
          );
        } else {
          const navigationAction = {
            name: route as keyof StackParameterList,
            ...(options && options),
          };
          navigation.navigate(
            navigationAction as Parameters<typeof navigation.navigate>[0],
          );
        }
      }
    },
  },
};
