import { getServiceWorkerPreloadAddons } from '@lace-contract/module';
import { describe, expect, it } from 'vitest';

import { allModules } from '../../src/util/all-modules';

/**
 * Chrome MV3 allows `importScripts` only during the service worker's initial
 * evaluation and its `install` event, and webpack compiles a service-worker
 * `import()` into `importScripts`. A chunk not imported during install is
 * refused forever for that profile — the failure mode behind LW-15492, where
 * signing broke permanently for the affected users.
 *
 * These assertions are static: they check the preload set is wired, not that
 * every loader executes. Executing them would import the whole module graph.
 */
describe('service worker preload set', () => {
  const preloadAddons = getServiceWorkerPreloadAddons(allModules);

  it('is not empty', () => {
    // A zero-length set would make every other assertion here vacuous.
    expect(preloadAddons.length).toBeGreaterThan(0);
  });

  it('declares the signer factory', () => {
    // Dropping `preloadInServiceWorker` from signerFactoryAddonContract would
    // silently remove signing from the install phase again.
    expect(preloadAddons).toContain('loadSignerFactory');
  });

  it('exposes the signer factory as a loader some module can preload', () => {
    // Declaring the addon is not enough: `preloadModuleAddons` only invokes an
    // addon that is a function, and skips anything else without complaint. An
    // addon renamed or dropped from the module would leave the contract's
    // declaration intact and the preload silently doing nothing.
    const loaders = allModules
      .map(
        module => (module.addons as Record<string, unknown>).loadSignerFactory,
      )
      .filter(addon => typeof addon === 'function');

    expect(loaders.length).toBeGreaterThan(0);
  });
});
