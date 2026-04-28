import { isWeb, Sheet, useTheme } from '@lace-lib/ui-toolkit';
import {
  createNavigatorFactory,
  StackRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type NavigatorTypeBagBase,
  type ParamListBase,
  type StackNavigationState,
  type StaticConfig,
  type StackActionHelpers,
  type StackRouterOptions,
  type TypedNavigator,
} from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  type BaseSheetParams,
  type SheetNavigationEventMap,
  type SheetNavigationOptions,
  type SheetNavigationProperty,
} from '../types';

import { NavigationControls } from './navigation-controls';

export const sheetRef = React.createRef<Sheet>();

// Flag to prevent sheet from closing during navigation transitions
// This is set by SheetControls before navigation and checked by onClose
// Using an object to allow mutation while satisfying the no-let lint rule
const navigationState = { isNavigating: false };
export const isNavigatingSheet = (): boolean => navigationState.isNavigating;
export const setNavigatingSheet = (value: boolean): void => {
  navigationState.isNavigating = value;
};

type Props = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  StackNavigationState<ParamListBase>,
  SheetNavigationOptions,
  SheetNavigationEventMap,
  SheetNavigationProperty<ParamListBase>
> &
  StackRouterOptions;

const SheetStackNavigator = ({ ...rest }: Props) => {
  const { isSideMenu } = useTheme();
  const { state, descriptors, NavigationContent } = useNavigationBuilder<
    StackNavigationState<ParamListBase>,
    StackRouterOptions,
    StackActionHelpers<ParamListBase>,
    SheetNavigationOptions,
    SheetNavigationEventMap
  >(StackRouter, rest);

  const shouldPreventClose = useMemo(() => {
    const focusedRoute = state.routes[state.index];
    if (!focusedRoute) return false;
    const params = focusedRoute.params as BaseSheetParams | undefined;
    const descriptor = descriptors[focusedRoute.key];
    const options = descriptor?.options as SheetNavigationOptions | undefined;
    return params?.preventClose === true || options?.preventClose === true;
  }, [state.routes, state.index, descriptors]);

  const onClose = useCallback(() => {
    // If we're in the middle of a navigation transition, don't actually close
    if (isNavigatingSheet() && sheetRef.current) {
      sheetRef.current.expand();
      return;
    }
    // If current screen prevents close (e.g. send in progress), re-expand
    if (shouldPreventClose && sheetRef.current) {
      sheetRef.current.expand();
    }
  }, [shouldPreventClose]);

  const closeSheet = useCallback(() => {
    if (shouldPreventClose) return;
    NavigationControls.sheets.close();
  }, [shouldPreventClose]);

  const options = useMemo(() => {
    const descriptor = descriptors[state.routes[state.index].key];
    return descriptor.options;
  }, [state.routes, state.index, descriptors]);

  const content = useMemo(() => {
    const focusedRoute = state.routes[state.index];
    const { params, key } = focusedRoute;
    const willPreventAnimation = (params as BaseSheetParams)?.preventAnimation;
    const descriptor = descriptors[key];
    const enteringAnimation = isWeb
      ? undefined
      : willPreventAnimation
      ? undefined
      : FadeIn.delay(200);

    const exitingAnimation = isWeb
      ? undefined
      : willPreventAnimation
      ? undefined
      : FadeOut;

    return (
      <Animated.View
        style={isWeb ? styles.webContainer : undefined}
        key={key}
        entering={enteringAnimation}
        exiting={exitingAnimation}>
        {descriptor.render()}
      </Animated.View>
    );
  }, [state.routes, state.index, descriptors, options]);

  const sheetCloseProps = useMemo(
    () => ({
      enablePanDownToClose: !shouldPreventClose,
      enableBackdropClose: !shouldPreventClose,
      onCloseRequest: (): boolean => !shouldPreventClose,
    }),
    [shouldPreventClose],
  );

  if (isSideMenu) {
    return (
      <Sheet
        onClose={onClose}
        closeSheet={closeSheet}
        sheetRef={sheetRef}
        initialIndex={-1}
        enableDynamicSizing={false}
        {...sheetCloseProps}>
        <NavigationContent>{content}</NavigationContent>
      </Sheet>
    );
  }

  return (
    <Sheet
      onClose={onClose}
      closeSheet={closeSheet}
      sheetRef={sheetRef}
      initialIndex={undefined}
      enableDynamicSizing={!isWeb && !options.snapPoints}
      snapPoints={options.snapPoints}
      footerComponent={options.footer}
      {...sheetCloseProps}>
      <NavigationContent>{content}</NavigationContent>
    </Sheet>
  );
};

// On web, the sheet relies on a flex chain (content maxHeight -> wrapper ->
// Sheet.Scroll) to constrain the scrollable area and keep the absolute
// SheetFooter anchored. We need the wrapper to participate in that chain.
// flexBasis: 'auto' preserves natural sizing for short content, while
// flexShrink + minHeight: 0 allow it to shrink past its content height when
// the parent's maxHeight kicks in, so the ScrollView inside actually scrolls.
// On native we intentionally skip these styles to avoid conflicting with
// @gorhom/bottom-sheet's dynamic sizing.
const styles = StyleSheet.create({
  webContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minHeight: 0,
  },
});

export const createSheetStackNavigator = <
  const ParameterList extends ParamListBase,
  const NavigatorID extends string | undefined = undefined,
  const TypeBag extends NavigatorTypeBagBase = {
    ParamList: ParameterList;
    NavigatorID: NavigatorID;
    State: StackNavigationState<ParameterList>;
    ScreenOptions: SheetNavigationOptions;
    EventMap: SheetNavigationEventMap;
    NavigationList: {
      [RouteName in keyof ParameterList]: SheetNavigationProperty<
        ParameterList,
        RouteName,
        NavigatorID
      >;
    };
    Navigator: typeof SheetStackNavigator;
  },
  const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>,
>(
  config?: Config,
): TypedNavigator<TypeBag, Config> => {
  return createNavigatorFactory(SheetStackNavigator)(config) as TypedNavigator<
    TypeBag,
    Config
  >;
};
