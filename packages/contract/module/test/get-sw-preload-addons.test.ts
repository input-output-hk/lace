import { describe, expect, it } from 'vitest';

import {
  ContractName,
  ModuleName,
  combineContracts,
  getServiceWorkerPreloadAddons,
} from '../src';

import type { LaceModule } from '../src';

describe('getServiceWorkerPreloadAddons', () => {
  it('returns empty array when no modules have preloadInServiceWorker', () => {
    const modules = [
      {
        moduleName: ModuleName('test-module'),
        implements: combineContracts([
          {
            name: ContractName('test-addon'),
            contractType: 'addon',
            instance: 'exactly-one',
            provides: { addons: [] },
          },
        ] as const),
        addons: {},
      },
    ] as LaceModule[];
    expect(getServiceWorkerPreloadAddons(modules)).toEqual([]);
  });

  it('returns empty array when preloadInServiceWorker is false', () => {
    const modules = [
      {
        moduleName: ModuleName('test-module'),
        implements: combineContracts([
          {
            name: ContractName('test-addon'),
            contractType: 'addon',
            instance: 'exactly-one',
            preloadInServiceWorker: false,
            provides: { addons: [] },
          },
        ] as const),
        addons: {},
      },
    ] as LaceModule[];
    expect(getServiceWorkerPreloadAddons(modules)).toEqual([]);
  });

  it('returns addon names from contracts with preloadInServiceWorker: true', () => {
    const modules = [
      {
        moduleName: ModuleName('test-module'),
        implements: combineContracts([
          {
            name: ContractName('sw-addon'),
            contractType: 'addon',
            instance: 'exactly-one',
            preloadInServiceWorker: true,
            provides: { addons: [] },
          },
        ] as const),
        addons: {},
      },
    ] as LaceModule[];
    const result = getServiceWorkerPreloadAddons(modules);
    expect(result).toEqual([]);
  });

  it('ignores store contracts', () => {
    const modules = [
      {
        moduleName: ModuleName('test-module'),
        implements: combineContracts([
          {
            name: ContractName('store-contract'),
            contractType: 'store',
            instance: 'exactly-one',
            mixin: (m: LaceModule) => m,
          },
        ] as const),
        addons: {},
      },
    ] as LaceModule[];
    expect(getServiceWorkerPreloadAddons(modules)).toEqual([]);
  });

  it('ignores sideEffectDependency contracts', () => {
    const modules = [
      {
        moduleName: ModuleName('test-module'),
        implements: combineContracts([
          {
            name: ContractName('dep-contract'),
            contractType: 'sideEffectDependency',
            instance: 'exactly-one',
          },
        ] as const),
        addons: {},
      },
    ] as LaceModule[];
    expect(getServiceWorkerPreloadAddons(modules)).toEqual([]);
  });

  it('handles modules with multiple contracts', () => {
    const modules = [
      {
        moduleName: ModuleName('multi-contract-module'),
        implements: combineContracts([
          {
            name: ContractName('addon-1'),
            contractType: 'addon',
            instance: 'exactly-one',
            preloadInServiceWorker: true,
            provides: { addons: [] },
          },
          {
            name: ContractName('addon-2'),
            contractType: 'addon',
            instance: 'exactly-one',
            preloadInServiceWorker: false,
            provides: { addons: [] },
          },
        ] as const),
        addons: {},
      },
    ] as LaceModule[];
    const result = getServiceWorkerPreloadAddons(modules);
    expect(result).toEqual([]);
  });

  it('handles empty modules array', () => {
    expect(getServiceWorkerPreloadAddons([])).toEqual([]);
  });
});
