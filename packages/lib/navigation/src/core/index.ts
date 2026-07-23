import { createTrueSheetNavigator } from '@lodev09/react-native-true-sheet/navigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  DefaultTheme,
  NavigationContainer,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {
  createStackNavigator,
  type StackNavigationProp,
} from '@react-navigation/stack';

import { navigationRef } from './navigationReferences';
export * from './stack-navigator-config';

import type { NavigationContainerEventMap } from './navigationReferences';
import type {
  StackParameterList,
  TabParameterList,
  StackScreenProps,
  SheetParameterList,
  SheetScreenProps,
} from '../types';

const Tab = createBottomTabNavigator<TabParameterList>();

const Stack = createStackNavigator<StackParameterList>();

const SheetStack = createTrueSheetNavigator<SheetParameterList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

export type {
  StackNavigationProp,
  StackScreenProps,
  SheetScreenProps,
  NavigationContainerEventMap,
};

export {
  Tab,
  Stack,
  SheetStack,
  navigationRef,
  NavigationContainer,
  navigationTheme,
  useNavigation,
  useFocusEffect,
};

export { useNavigationObservability } from './navigation-observability';
export {
  NavigationControls,
  findLastRouteIndexByName,
  getFocusedSheetPosition,
  onSheetClose,
  handleInteractiveSheetDismiss,
  sheetStackScreenListeners,
} from './navigation-controls';
export type { NavigateParams } from './navigation-controls';
