import type { LaceAddons, LaceModule } from './types';

/**
 * Extracts addon names from modules whose contracts have `preloadInServiceWorker: true`.
 * Used by browser extensions to automatically discover which addons need to be
 * preloaded in the service worker during the install phase.
 *
 * @param modules - Array of LaceModule instances to scan
 * @returns Array of unique addon names that should be preloaded in service worker
 */
export const getServiceWorkerPreloadAddons = (
  modules: LaceModule[],
): Array<keyof LaceAddons> => {
  const addonNames = new Set<keyof LaceAddons>();

  for (const module of modules) {
    for (const contract of module.implements.contracts) {
      if (
        contract.contractType === 'addon' &&
        'preloadInServiceWorker' in contract &&
        contract.preloadInServiceWorker === true
      ) {
        for (const addonName of contract.provides.addons) {
          addonNames.add(addonName);
        }
      }
    }
  }

  return [...addonNames];
};
