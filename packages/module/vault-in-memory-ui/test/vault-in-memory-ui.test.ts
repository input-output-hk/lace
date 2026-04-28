import { describe, it, expect } from 'vitest';

import moduleMap from '../src/index';

describe('vault-in-memory-ui module', () => {
  it('should export a module map with the expected app configurations', () => {
    expect(moduleMap).toBeDefined();
    expect(moduleMap['lace-extension']).toBeDefined();
    expect(moduleMap['lace-mobile']).toBeDefined();
  });

  it('should have the correct module name', () => {
    const module = moduleMap['lace-extension'];
    expect(module?.moduleName).toBe('vault-in-memory-ui');
  });

  it('should implement walletSettingsUICustomisationContract', () => {
    const module = moduleMap['lace-extension'];
    expect(module?.implements).toBeDefined();
  });

  it('should have loadWalletSettingsUICustomisations addon', () => {
    const module = moduleMap['lace-extension'];
    expect(module?.addons.loadWalletSettingsUICustomisations).toBeDefined();
    expect(typeof module?.addons.loadWalletSettingsUICustomisations).toBe(
      'function',
    );
  });
});
