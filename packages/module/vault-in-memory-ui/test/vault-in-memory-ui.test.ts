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

  it('registers the mnemonic sheet pages on the in-process arms', () => {
    for (const app of ['lace-extension', 'lace-mobile'] as const) {
      expect(typeof moduleMap[app]?.addons.loadSheetPages).toBe('function');
    }
  });
});

// ADR 52: the sandboxed remote guest must not ship a mnemonic-entry or
// mnemonic-display surface, and a registered ROUTE into one is the capture
// vector. Every screen in `./addons/sheetPages` is one, so the guest arm
// registers none of them — it keeps the module only for the exactly-one
// recovery-phrase store the shared account-management screens depend on.
describe('vault-in-memory-ui guest arm', () => {
  const guest = moduleMap['lace-extension-guest'];

  it('is loaded by the guest', () => {
    expect(guest).toBeDefined();
    expect(guest?.moduleName).toBe('vault-in-memory-ui');
  });

  it('registers NO sheet pages, so no route reaches a mnemonic surface', () => {
    expect(guest?.addons.loadSheetPages).toBeUndefined();
    expect(Object.keys(guest?.addons ?? {})).toEqual([]);
  });

  it('does not implement the wallet-settings customisation (the reveal is a host ceremony)', () => {
    expect(guest?.addons.loadWalletSettingsUICustomisations).toBeUndefined();
  });
});
