import { createNavigationContainerRef } from '@react-navigation/native';

import type { SheetParameterList } from '../types';

export type { NavigationContainerEventMap } from '@react-navigation/core';

export const navigationRef = createNavigationContainerRef<SheetParameterList>();
