import type { LaceAddons, LaceModule } from './types';

/**
 * Preloads all specified addons for a given module.
 * Safely handles non-function addons by returning undefined.
 *
 * Used by browser extensions to preload addons in the service worker
 * during the install phase.
 *
 * @param module - The module containing addons to preload
 * @param addonNames - Array of addon names to preload
 * @returns Array of promises from calling each addon loader
 */
export const preloadModuleAddons = (
  module: LaceModule,
  addonNames: Array<keyof LaceAddons>,
): Promise<unknown>[] =>
  addonNames.map(async addonName => {
    const addons = module.addons as unknown as Record<
      string,
      (() => unknown) | undefined
    >;
    const addon = addons[addonName];
    if (typeof addon === 'function') {
      return addon();
    }
    return undefined;
  });
