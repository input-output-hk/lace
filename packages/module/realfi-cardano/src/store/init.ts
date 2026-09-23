import { initializeDependencies } from './dependencies';
import {
  makeEarnedUsdCache,
  makePendingUnstakeCache,
  makePendingUnstakeRefresh,
  makeStakingYieldPrime,
  makeYieldInfoCache,
} from './side-effects';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInitSync<LaceModuleStoreInit> = (props, dependencies) => ({
  sideEffectDependencies: initializeDependencies(props, dependencies),
  sideEffects: [
    makeEarnedUsdCache,
    makePendingUnstakeCache,
    makePendingUnstakeRefresh,
    makeStakingYieldPrime,
    makeYieldInfoCache,
  ],
});

export default store;
