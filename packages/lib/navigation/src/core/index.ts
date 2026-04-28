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

import { navigationRef, sheetNavigationRef } from './navigationReferences';
export * from './stack-navigator-config';
import { createSheetStackNavigator } from './sheetNavigator';

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

const SheetStack = createSheetStackNavigator<SheetParameterList>();

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
  sheetNavigationRef,
  NavigationContainer,
  navigationTheme,
  useNavigation,
  useFocusEffect,
};

export { useNavigationObservability } from './navigation-observability';
export { NavigationControls } from './navigation-controls';
export { onSheetClose } from './sheet-controls';
export { sheetRef } from './sheetNavigator';
