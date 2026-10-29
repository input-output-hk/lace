// The stable SDK build resolves this file in place of augmentations.ts: the
// SDK runs headless, so the activities contract adds its state and no UI
// customisation addon.
import type { activitiesReducers } from './store/slice';
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
}
