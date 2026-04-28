/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { selectModules, type FeatureFlag } from '@lace-contract/feature';
import {
  createModuleLoader,
  createReduxPersistStorage,
  createStore,
  findStorageModule,
  type ActionObservables,
  type AppConfig,
  type Environment,
  type LaceModule,
  type ModuleActionCreators,
  type ModuleSelectors,
  type ScopedActionCreators,
  type ScopedSelectors,
  type StateObservables,
} from '@lace-contract/module';
import { dummyLogger } from 'ts-log';

import { sdkBaseModule } from './base-module';

import type { State } from '@lace-contract/module';

// ---- Helper types for inferring module types ----

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type MergedSelectors<T extends readonly LaceModule[]> = UnionToIntersection<
  ModuleSelectors<T[number]>
>;

type MergedActionCreators<T extends readonly LaceModule[]> =
  UnionToIntersection<ModuleActionCreators<T[number]>>;

// ---- Typed dispatch key types ----

// Excludes string/number/symbol index signatures, keeping only known literal keys
type KnownKeys<T> = keyof {
  [K in keyof T as string extends K
    ? never
    : number extends K
    ? never
    : symbol extends K
    ? never
    : K]: unknown;
};

type KeyCombinations<T> = T extends object
  ? {
      [K in KnownKeys<T>]: `${K & string}.${string & keyof T[K & keyof T]}`;
    }[KnownKeys<T>]
  : never;

type Key1<Key> = Key extends `${infer T}.${infer _}` ? T : never;
type Key2<Key> = Key extends `${infer _}.${infer T}` ? T : never;

type DispatchFunction<ActionCreators extends ScopedActionCreators> = <
  Key extends KeyCombinations<ActionCreators>,
  Scope extends Key1<Key>,
  ActionCreatorName extends Key2<Key> & keyof ActionCreators[Scope],
>(
  key: Key,
  ...args: ActionCreators[Scope][ActionCreatorName] extends (
    ...args: infer A
  ) => any
    ? A
    : never
) => void;

// ---- Public types ----

export type CreateLaceWalletProps<
  T extends readonly LaceModule[] = readonly LaceModule[],
> = {
  modules: T;
  environment: Environment;
  /**
   * Partial while the SDK type system is being developed.
   * Will become non-partial with inferred types (like `dispatch`,
   * `stateObservables`, and `actionObservables` already are).
   */
  config: Partial<AppConfig>;
  featureFlags?: FeatureFlag[];
};

export type LaceWallet<
  Selectors extends ScopedSelectors = ScopedSelectors,
  ActionCreators extends ScopedActionCreators = ScopedActionCreators,
> = {
  stateObservables: StateObservables<Selectors>;
  actionObservables: ActionObservables<ActionCreators>;
  dispatch: DispatchFunction<ActionCreators>;
  /**
   * Partial while the SDK type system is being developed.
   * Will become non-partial with inferred types (like `dispatch`,
   * `stateObservables`, and `actionObservables` already are).
   */
  getState: () => Partial<State>;
  /** @internal Not for direct SDK consumer use. */
  _loadModules: ReturnType<typeof createModuleLoader>;
};

// ---- Implementation ----

const parseKey = (key: string): [string, string] => {
  const items = key.split('.');
  if (items.length < 2)
    throw new Error(
      `Invalid key "${key}", expected format: "{scope}.{actionName}"`,
    );
  return items as [string, string];
};

export const createLaceWallet = async <T extends readonly LaceModule[]>(
  props: CreateLaceWalletProps<T>,
): Promise<
  LaceWallet<
    MergedSelectors<T> & ScopedSelectors,
    MergedActionCreators<T> & ScopedActionCreators
  >
> => {
  const { modules, environment, config, featureFlags = [] } = props;
  const app = 'lace-sdk' as const;
  const logger = dummyLogger;

  // 1. Prepend the SDK base module
  const allModules = [sdkBaseModule as LaceModule, ...modules];

  // 2. Filter by feature flags and validate compatibility
  const { modulesToLoad } = selectModules(
    allModules,
    featureFlags,
    environment,
  );

  // 3. Create module loader
  const runtime = {
    app,
    env: environment,
    // TODO: remove cast once AppConfig fields are individually optional upstream
    config: config as AppConfig,
    platform: 'web' as const,
    features: {
      availableModules: allModules,
      loaded: {
        featureFlags,
        modules: modulesToLoad.map(m => ({
          moduleName: m.moduleName,
          feature: m.feature ? { metadata: m.feature.metadata } : undefined,
        })),
      },
    },
  };
  const moduleInitProps = {
    modules: modulesToLoad,
    runtime,
  };
  const loadModules = createModuleLoader(moduleInitProps, { logger });

  // 4. Derive redux-persist storage from the loaded storage module
  const keyValueStorageFactory = await findStorageModule(moduleInitProps, {
    logger,
  });
  const reduxPersistStorage = createReduxPersistStorage(keyValueStorageFactory);

  // 5. Load app context initializers (e.g., i18n)
  const initializers = await loadModules('addons.loadInitializeAppContext');
  for (const init of initializers) {
    (init as () => void)();
  }

  // 6. Create store
  const { store, stateObservables, actionObservables } = await createStore(
    { ...moduleInitProps, loadModules },
    { logger, reduxPersistStorage },
  );

  // 7. Build typed dispatch function
  const stores = await loadModules('store');
  const actions: Record<string, Record<string, (...args: any[]) => any>> = {};
  for (const s of stores) {
    Object.assign(actions, s.context.actions);
  }

  const dispatch: DispatchFunction<any> = (key: string, ...args: any[]) => {
    const [scope, actionCreatorName] = parseKey(key);
    const actionCreator = actions[scope]?.[actionCreatorName];
    if (!actionCreator) {
      throw new Error(`Unknown action: ${key}`);
    }
    store.dispatch(actionCreator(...args));
  };

  return {
    // TODO: createStore returns unparameterized StateObservables/ActionObservables;
    // cast needed until createStore is generic over module types
    stateObservables: stateObservables as any,
    actionObservables: actionObservables as any,
    // TODO: dispatch is dynamically constructed from loaded stores;
    // cast needed until dispatch builder can infer types from modules
    dispatch: dispatch as any,
    getState: () => store.getState(),
    _loadModules: loadModules,
  };
};
