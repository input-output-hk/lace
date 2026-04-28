import merge from 'lodash/merge';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import {
  ContractName,
  ModuleName,
  combineContracts,
  combineStore,
  createMixin,
  createModuleLoader,
} from '../src';

import type {
  CreateLoaderProps,
  LaceModule,
  LaceModuleStoreInit,
} from '../src';

describe('create-module-loader', () => {
  it('returns a function that loads all modules and mixins', async () => {
    const moduleStoreContext = {
      actions: { module: { moduleAction: () => ({ type: 'MODULE_ACTION' }) } },
      selectors: { module: { moduleSelector: () => 1 } },
    };
    const implementedContractMixinStoreContext = {
      actions: { mixin: { mixinAction: () => ({ type: 'MIXIN_ACTION' }) } },
      selectors: { mixin: { mixinSelector: () => 2 } },
    };
    const zeroOrMoreDependencyContractMixinStoreContext = {
      actions: {
        zeroOrMoreMixin: {
          zeroOrMoreMixinAction: () => ({ type: 'ZERO_OR_MORE_MIXIN_ACTION' }),
        },
      },
      selectors: { zeroOrMoreMixin: { zeroOrMoreMixinSelector: () => 3 } },
    };
    const moduleStoreInit: LaceModuleStoreInit = {};
    const implementedContractMixinStoreInit: LaceModuleStoreInit = {
      middleware: [],
      reducers: {},
      sideEffectDependencies: {},
      sideEffects: [],
    };
    const zeroOrMoreDependencyContractMixinStoreInit: LaceModuleStoreInit = {
      middleware: [],
      reducers: {},
      sideEffectDependencies: {},
      sideEffects: [],
    };
    const implementedContractMixinStore = {
      context: implementedContractMixinStoreContext,
      load: async () => ({ default: () => implementedContractMixinStoreInit }),
    };
    const zeroOrMoreDependencyContractStore = {
      context: zeroOrMoreDependencyContractMixinStoreContext,
      load: async () => ({
        default: () => zeroOrMoreDependencyContractMixinStoreInit,
      }),
    };
    const moduleStore = {
      context: moduleStoreContext,
      load: async () => ({ default: () => moduleStoreInit }),
    };
    const modules: LaceModule[] = [
      {
        moduleName: ModuleName('moduleExportsStore'),
        implements: combineContracts([]),
        store: moduleStore,
        addons: {},
      },
      {
        moduleName: ModuleName('moduleImplementsContractThatExportsStore'),
        implements: combineContracts([
          {
            name: ContractName('contractMixinExportsStore'),
            contractType: 'store',
            instance: 'exactly-one',
            mixin: createMixin(laceModule => ({
              store: combineStore(laceModule, implementedContractMixinStore),
            })),
          },
        ]),
        dependsOn: combineContracts([
          {
            name: ContractName('zeroOrMoreContract'),
            contractType: 'store',
            instance: 'zero-or-more',
            mixin: createMixin(laceModule => ({
              store: combineStore(
                laceModule,
                zeroOrMoreDependencyContractStore,
              ),
            })),
          },
        ]),
        addons: {},
      },
    ];
    const loader = createModuleLoader({ modules } as CreateLoaderProps, {
      logger: dummyLogger,
    });

    const allStoreExports = await loader('store');
    expect(allStoreExports.map(s => s.context)).toEqual(
      [
        merge(implementedContractMixinStore, zeroOrMoreDependencyContractStore),
        moduleStore,
      ].map(s => s.context),
    );
  });
});
