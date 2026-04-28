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
