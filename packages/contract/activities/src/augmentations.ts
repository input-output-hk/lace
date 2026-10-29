// The stable SDK build resolves augmentations.stable.ts in place of this file,
// which adds the state and no UI customisation addon.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.

import type { activitiesReducers } from './store/slice';
import type {
  ActivitiesListUICustomisation,
  ActivityOfTokenUICustomisation,
  ActivitiesItemUICustomisation,
  ActivityDetailsSheetUICustomisation,
} from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

/**
 * Chain-specific metadata carried on an activity's `blockchainSpecific` field.
 * Empty here; each blockchain context package augments it with a key for its
 * own chain (for example `Cardano`), so the merged interface lists every
 * chain's metadata shape.
 */
export interface BlockchainSpecificActivityMetadata {}

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
