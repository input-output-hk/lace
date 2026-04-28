import { describe, expect, it, vi } from 'vitest';

import {
  ContractName,
  ModuleName,
  combineContracts,
  preloadModuleAddons,
} from '../src';

import type { LaceAddons, LaceModule } from '../src';

// Helper to cast addon names for tests since LaceAddons interface is augmented externally
const addonNames = (...names: string[]): Array<keyof LaceAddons> =>
  names as unknown as Array<keyof LaceAddons>;

describe('preloadModuleAddons', () => {
  it('returns empty array when addonNames is empty', () => {
    const module = {
      moduleName: ModuleName('test-module'),
      implements: combineContracts([]),
      addons: {},
    } as LaceModule;

    const result = preloadModuleAddons(module, []);
    expect(result).toEqual([]);
  });

  it('calls addon functions and returns their promises', async () => {
    const mockAddonA = vi.fn().mockResolvedValue('resultA');
    const mockAddonB = vi.fn().mockResolvedValue('resultB');

    const module = {
      moduleName: ModuleName('test-module'),
      implements: combineContracts([
        {
          name: ContractName('test-addon'),
          contractType: 'addon',
          instance: 'exactly-one',
          provides: { addons: [] },
        },
      ] as const),
      addons: {
        bip32Ed25519: mockAddonA,
        blake2b: mockAddonB,
      },
    } as unknown as LaceModule;

    const result = preloadModuleAddons(
      module,
      addonNames('bip32Ed25519', 'blake2b'),
    );

    expect(result).toHaveLength(2);
    expect(mockAddonA).toHaveBeenCalledTimes(1);
    expect(mockAddonB).toHaveBeenCalledTimes(1);

    const resolved = await Promise.all(result);
    expect(resolved).toEqual(['resultA', 'resultB']);
  });

  it('returns undefined for non-function addons', async () => {
    const module = {
      moduleName: ModuleName('test-module'),
      implements: combineContracts([]),
      addons: {
        bip32Ed25519: undefined,
        blake2b: null,
      },
    } as unknown as LaceModule;

    const result = preloadModuleAddons(
      module,
      addonNames('bip32Ed25519', 'blake2b'),
    );

    const resolved = await Promise.all(result);
    expect(resolved).toEqual([undefined, undefined]);
  });

  it('handles modules with no matching addons', async () => {
    const module = {
      moduleName: ModuleName('test-module'),
      implements: combineContracts([]),
      addons: {},
    } as LaceModule;

    const result = preloadModuleAddons(module, addonNames('bip32Ed25519'));

    expect(result).toHaveLength(1);
    const resolved = await Promise.all(result);
    expect(resolved).toEqual([undefined]);
  });

  it('handles mixed function and non-function addons', async () => {
    const mockAddon = vi.fn().mockResolvedValue('result');

    const module = {
      moduleName: ModuleName('test-module'),
      implements: combineContracts([]),
      addons: {
        bip32Ed25519: mockAddon,
        blake2b: undefined,
      },
    } as unknown as LaceModule;

    const result = preloadModuleAddons(
      module,
      addonNames('bip32Ed25519', 'blake2b'),
    );

    const resolved = await Promise.all(result);
    expect(resolved).toEqual(['result', undefined]);
    expect(mockAddon).toHaveBeenCalledTimes(1);
  });
});
