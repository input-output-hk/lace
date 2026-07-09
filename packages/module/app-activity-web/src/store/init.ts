import { defer, EMPTY } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import { featureFlagRefreshTrigger$ } from './refresh-trigger';
import { sideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

// `runtime.reload()` is synchronous and returns void. Wrap in `defer` so the
// call only happens on subscription (lazy, observable-shaped) — symmetric to
// mobile's `from(Updates.reloadAsync())`.
const performAppReload = () =>
  defer(() => {
    runtime.reload();
    return EMPTY;
  });

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects,
  sideEffectDependencies: {
    featureFlagRefreshTrigger$,
    performAppReload,
  },
});

export default store;
