import uniq from 'lodash/uniq';

import type {
  ModuleExports,
  LaceInit,
  LaceModule,
  LaceModuleMixin,
  LaceModuleStore,
  LaceModuleStoreInit,
} from './types';

type MixinStore<
  Selectors extends object = object,
  ActionCreators extends object = object,
> = NonNullable<LaceModule<Selectors, ActionCreators>['store']>;

/**
 * Combines a module's store with a contract mixin's store. Reducers,
 * middleware, side effects, persist config, preloaded state, selectors and
 * actions of both are merged; the mixin's entries win on a key clash.
 */
export const combineStore = <
  Selectors extends object = object,
  ActionCreators extends object = object,
>(
  module: ModuleExports,
  mixinStore: MixinStore<Selectors, ActionCreators>,
): LaceModuleStore<Selectors, ActionCreators> => {
  const combinedStoreInit =
    (
      mixinStoreInit: { default: LaceInit<LaceModuleStoreInit> },
      moduleStoreInit?: { default: LaceInit<LaceModuleStoreInit> },
    ): LaceInit<LaceModuleStoreInit> =>
    async (props, dependencies) => {
      const loadedModuleStore = await moduleStoreInit?.default(
        props,
        dependencies,
      );
      const loadedMixinStore = await mixinStoreInit.default(
        props,
        dependencies,
      );
      return {
        middleware: uniq([
          ...(loadedModuleStore?.middleware || []),
          ...(loadedMixinStore.middleware || []),
        ]),
        reducers: {
          ...loadedModuleStore?.reducers,
          ...loadedMixinStore.reducers,
        },
        persistConfig: {
          ...loadedModuleStore?.persistConfig,
          ...loadedMixinStore.persistConfig,
        },
        preloadedState: {
          ...loadedModuleStore?.preloadedState,
          ...loadedMixinStore.preloadedState,
        },
        sideEffectDependencies: {
          ...loadedModuleStore?.sideEffectDependencies,
          ...loadedMixinStore.sideEffectDependencies,
        },
        sideEffects: uniq([
          ...(loadedModuleStore?.sideEffects || []),
          ...(loadedMixinStore.sideEffects || []),
        ]),
      };
    };
  return {
    load: async () => {
      const moduleStoreInit = await module.store?.load();
      const mixinStoreInit = await mixinStore.load();
      return { default: combinedStoreInit(mixinStoreInit, moduleStoreInit) };
    },
    context: {
      actions: {
        ...module.store?.context.actions,
        ...mixinStore.context.actions,
      },
      selectors: Object.assign(
        {},
        module.store?.context.selectors,
        mixinStore.context.selectors,
      ),
    },
  };
};

/**
 * Creates a contract mixin: a function that patches every module implementing
 * the contract with the properties `patchModule` returns.
 */
export const createMixin =
  <Selectors extends object = object, ActionCreators extends object = object>(
    patchModule: (
      laceModule: ModuleExports,
    ) => Partial<ModuleExports<Selectors, ActionCreators>>,
  ): LaceModuleMixin<Selectors, ActionCreators> =>
  laceModule =>
    ({
      ...laceModule,
      addons: laceModule.addons || {},
      ...patchModule(laceModule),
    } as LaceModule<Selectors, ActionCreators>);
