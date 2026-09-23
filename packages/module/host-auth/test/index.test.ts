import { describe, expect, it } from 'vitest';

import moduleMap from '../src';

type AddonLoader = () => Promise<{ default: unknown }>;

const guestModule = moduleMap['lace-extension-guest']!;
const addonLoaders = guestModule.addons as unknown as Record<
  string,
  AddonLoader
>;

describe('host-auth module', () => {
  it('registers for the two guest apps only', () => {
    expect(Object.keys(moduleMap)).toEqual([
      'lace-extension-carbon',
      'lace-extension-guest',
    ]);
    expect(guestModule.moduleName).toBe('host-auth');
  });

  it('carries a store, which is what supplies the always-active wallet posture', () => {
    expect(guestModule.store).toBeDefined();
  });

  it('provides exactly the two addons app-lock was the guest sole provider of', () => {
    expect(Object.keys(addonLoaders).sort()).toEqual([
      'loadAuthSecretVerifier',
      'loadSetupAppLock',
    ]);
  });

  it('code-splits both addon bodies behind dynamic imports', async () => {
    await expect(addonLoaders.loadSetupAppLock()).resolves.toHaveProperty(
      'default',
    );
    await expect(addonLoaders.loadAuthSecretVerifier()).resolves.toHaveProperty(
      'default',
    );
  });
});
