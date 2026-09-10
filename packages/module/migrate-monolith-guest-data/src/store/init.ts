import { initializeDependencies } from './dependencies';
import {
  clearMigratedMonolithGuestData,
  importMonolithGuestData,
} from './side-effects/import';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [importMonolithGuestData, clearMigratedMonolithGuestData],
  sideEffectDependencies: initializeDependencies(),
});

export default redux;
