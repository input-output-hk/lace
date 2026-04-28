import { createNavigationContainerRef } from '@react-navigation/native';

import type { StackParameterList, SheetParameterList } from '../types';

export type { NavigationContainerEventMap } from '@react-navigation/core';

export const navigationRef = createNavigationContainerRef<StackParameterList>();

export const sheetNavigationRef =
  createNavigationContainerRef<SheetParameterList>();
