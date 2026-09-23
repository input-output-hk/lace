import { defer, EMPTY } from 'rxjs';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

// `window.location.reload()` is synchronous and returns void. Wrap in `defer` so
// the reload only happens on subscription (lazy, observable-shaped) — symmetric
// to the extension's `runtime.reload()` seam.
const performAppReload = () =>
  defer(() => {
    window.location.reload();
    return EMPTY;
  });

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffectDependencies: {
    performAppReload,
  },
});

export default store;
