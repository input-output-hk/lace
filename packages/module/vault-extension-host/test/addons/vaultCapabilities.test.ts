import { afterEach, describe, expect, it } from 'vitest';

import { loadVaultCapabilities } from '../../src/addons/vaultCapabilities';

import type {
  LaceCapability,
  LaceProvider,
} from '@lace-lib/extension-shell-api';

type GlobalWithLace = typeof globalThis & { lace?: LaceProvider };

// Typed as LaceCapability so these pins are compile-checked against the shared
// contract: a renamed host method fails type-check here instead of silently
// making the detection resolve false.
const setLace = (capabilities: readonly LaceCapability[]): void => {
  (globalThis as GlobalWithLace).lace = {
    version: '1.0.0',
    capabilities,
    request: async () => ({
      ok: false,
      error: { code: 'unsupported', message: 'stub' },
    }),
  };
};

const clearLace = (): void => {
  delete (globalThis as GlobalWithLace).lace;
};

// loadVaultCapabilities ignores its init context (feature detection only);
// await unwraps the `T | Promise<T>` return of the sync implementation.
const detect = async () =>
  loadVaultCapabilities(
    {} as Parameters<typeof loadVaultCapabilities>[0],
    {} as Parameters<typeof loadVaultCapabilities>[1],
  );

afterEach(() => {
  clearLace();
});

describe('loadVaultCapabilities', () => {
  it('reports every ceremony false when window.lace is absent', async () => {
    clearLace();
    expect(await detect()).toEqual({
      create: false,
      import: false,
      connectHardware: false,
      addAccount: false,
      renameAccount: false,
    });
  });

  it('enables create/import from the advertised wallet ops', async () => {
    setLace(['wallets.requestCreate', 'wallets.requestImport']);
    expect(await detect()).toEqual({
      create: true,
      import: true,
      connectHardware: false,
      addAccount: false,
      renameAccount: false,
    });
  });

  it('maps connectHardware to requestConnectHardware and addAccount to requestManager', async () => {
    setLace(['wallets.requestConnectHardware', 'wallets.requestManager']);
    expect(await detect()).toEqual({
      create: false,
      import: false,
      connectHardware: true,
      addAccount: true,
      renameAccount: false,
    });
  });

  it('maps renameAccount to its OWN method, requestRenameAccount', async () => {
    setLace(['wallets.requestRenameAccount']);
    expect(await detect()).toEqual({
      create: false,
      import: false,
      connectHardware: false,
      addAccount: false,
      renameAccount: true,
    });
  });

  // The whole reason the account rename is a separate method: a host serving
  // requestManager may still drop the unknown view hint and mount the list.
  it('keeps renameAccount false for a host advertising requestManager alone', async () => {
    setLace([
      'wallets.requestCreate',
      'wallets.requestImport',
      'wallets.requestConnectHardware',
      'wallets.requestManager',
    ]);
    expect((await detect()).renameAccount).toBe(false);
  });
});
