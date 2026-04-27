import type { activitiesReducers } from './store/slice';
import type {
  ActivitiesListUICustomisation,
  ActivityOfTokenUICustomisation,
  ActivitiesItemUICustomisation,
  ActivityDetailsSheetUICustomisation,
} from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof activitiesReducers> {}
  interface LaceAddons {
    readonly loadActivitiesListUICustomisations: DynamicallyLoadedInit<ActivitiesListUICustomisation>;
    readonly loadActivitiesItemUICustomisations: DynamicallyLoadedInit<ActivitiesItemUICustomisation>;
    readonly loadActivitiesOfTokenUICustomisations: DynamicallyLoadedInit<ActivityOfTokenUICustomisation>;
    readonly loadActivityDetailsSheetUICustomisations: DynamicallyLoadedInit<ActivityDetailsSheetUICustomisation>;
  }
}
