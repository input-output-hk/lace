import { REQUIRED_SYNC_PERCENTAGE } from './const';

import type { View, ViewType } from './types';

export const isViewOfType =
  <T extends ViewType>(viewType: T) =>
  (view: Readonly<View>): view is Omit<View, 'type'> & { type: T } =>
    view.type === viewType;

export const areViewsEqual = (view1: View, view2: View) =>
  view1.id === view2.id &&
  view1.location === view2.location &&
  view1.type === view2.type;

export const isSynced = (
  currentSyncPercentage?: number,
  desiredSyncPercentage = REQUIRED_SYNC_PERCENTAGE,
) => currentSyncPercentage && currentSyncPercentage >= desiredSyncPercentage;
