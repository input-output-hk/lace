/* eslint-disable @typescript-eslint/no-explicit-any */
import type { App } from './app';
import type {
  ModuleLoader,
  ContextualLoadableKey,
  LoadResult,
} from './create-module-loader';
import type { KeyValueStorageDependencies } from './storage';
import type { Environment, ViewId, ContractName } from './value-objects';
import type { ModuleName } from './value-objects/module-name.vo';
import type { WithLogger } from '@cardano-sdk/util';
import type {
  Middleware,
  ReducersMapObject,
  Action as ReduxAction,
} from '@reduxjs/toolkit';
import type { Epic } from 'redux-observable';
import type {
  PersistConfig,
  PersistedState as _PersistedState,
} from 'redux-persist';
import type { Observable } from 'rxjs';

export type { App } from './app';

/**
 * The configuration the loaded modules read, passed to `createLaceWallet` as
 * `config`. Each contract adds its own fields: with the Cardano modules these
 * include the feature-flag defaults, `defaultTestnetChainId`, `cardanoProvider`
 * (tip polling and Blockfrost settings keyed by network magic) and explorer
 * URLs.
 */
export interface AppConfig {}

/**
 * The platform the host application runs on, available to modules as
 * `Runtime.platform`.
 */
export type LacePlatform = 'android' | 'ios' | 'web-extension' | 'web';

/**
 * Describes the running application: which app it is, the configuration modules
 * read, the build environment and the platform. Modules receive it as `runtime`
 * in `ModuleInitProps` and in their side-effect dependencies.
 */
export interface Runtime {
  app: App;
  config: AppConfig;
  env: Environment;
  platform: LacePlatform;
}

/**
 * The root Redux state of the wallet. Each contract adds its slices to this
 * interface through module augmentation.
 */
export interface State {}
/**
 * The Redux action type dispatched through the wallet store and observed by
 * side effects.
 */
export interface Action extends ReduxAction {}

/**
 * The properties every module initializer receives: the module loader, the
 * runtime description and, in a UI context, the id of the view it runs in.
 */
export interface ModuleInitProps {
  loadModules: ModuleLoader;
  runtime: Runtime;
  /**
   * undefined for service worker
   */
  viewId?: ViewId;
}

/**
 * The services every module initializer receives alongside `ModuleInitProps`,
 * currently a `logger`.
 */
export type ModuleInitDependencies = WithLogger;

/**
 * The dependencies the store always provides to side effects: key-value
 * storage, the logger, the module init props, direct state access and
 * persisted-state flushing. Modules add their own through
 * `SideEffectDependencies`.
 */
export type DefaultSideEffectDependencies = KeyValueStorageDependencies &
  ModuleInitDependencies &
  ModuleInitProps & {
    /**
     * Most features shouldn't use this.
     * Prefer using selector observables (2nd SideEffect parameter).
     *
     * This will fail if called during SideEffect initialization.
     */
    __getState: () => State;
    /**
     * Flushes pending redux-persist writes to storage. A hard app reload
     * (`app.reloadApplication`) must await this first — redux-persist writes are
     * throttled/async, so state cleared right before a reload is otherwise lost
     * and the runtime rehydrates the stale pre-reload values.
     */
    flushPersistedState: () => Observable<void>;
  };

/**
 * The dependencies passed as the third argument to every `LaceSideEffect`.
 * Contracts add their own services to this interface through module
 * augmentation; loaded modules supply them through
 * `LaceModuleStoreInit.sideEffectDependencies`.
 */
export interface SideEffectDependencies extends DefaultSideEffectDependencies {}

/**
 * The store's combined action creators and selectors, as passed to side effects
 * alongside their dependencies.
 *
 * @typeParam Selectors - the scoped selectors available
 * @typeParam ActionCreators - the scoped action creators available
 */
export type WithLaceContext<Selectors = unknown, ActionCreators = unknown> = {
  actions: ActionCreators;
  selectors: Selectors;
};
/**
 * A redux-observable epic typed for the wallet store: the form a
 * `LaceSideEffect` takes once the store adapts it.
 */
export type LaceReduxObservableEpic = Epic<
  Action,
  Action,
  State,
  SideEffectDependencies & WithLaceContext
>;

/**
 * The element type of array type `T`, or `never` when `T` is not an array.
 */
export type ArrayType<T> = T extends Array<infer A> ? A : never;
/**
 * Any function type, used as a constraint in the module system's type helpers.
 */
export type AnyFunction = (...args: any[]) => any;
type ActionName = string;
type AnyActionCreators = Partial<
  Record<ActionName, (...args: any[]) => ReduxAction>
>;
/**
 * Action creators grouped by scope (usually a slice name), then by action name.
 * This is the shape of the `actions` a store exposes.
 */
export type ScopedActionCreators = Partial<Record<Scope, AnyActionCreators>>;
type Scope = string;
type SelectorName = string;
/**
 * Selectors grouped by scope (usually a slice name), then by selector name.
 * Each selector takes the root `State` and at most one argument; the argument
 * is typed `any` here so selectors with and without a parameter both fit, and
 * its real type applies where the selector is used.
 */
export type ScopedSelectors = Partial<
  Record<
    Scope,
    Partial<Record<SelectorName, (state: State, argument?: any) => unknown>>
  >
>;

/**
 * The union of the property value types of `T`.
 */
export type Values<T> = T[keyof T];
type OmitNever<T> = Pick<
  T,
  Values<{
    [Property in keyof T]: [T[Property]] extends [never] ? never : Property;
  }>
>;
/**
 * `T` restricted to its properties whose values are functions, dropping all
 * others.
 */
export type OmitEmptyActionCreators<T> = OmitNever<{
  [k in keyof T]: T[k] extends AnyFunction ? T[k] : never;
}>;

type _ReturnTypes<T> = Values<{
  [k in keyof T]: T[k] extends AnyFunction ? ReturnType<T[k]> : never;
}>;
type ReturnTypes<U> = U extends any ? _ReturnTypes<U> : never;
/**
 * The union of the action types produced by a scoped action-creator map, for
 * example the actions a side effect may emit.
 */
export type ActionType<ActionCreators> = ReturnTypes<Values<ActionCreators>>;

/**
 * A selector that takes only the state, used to tell parameterless selectors
 * apart when deriving `StateObservables`.
 */
export type AnyParameteterlessSelector = (s: State, argument: undefined) => any;
/**
 * A selector that takes the state and one argument, used when deriving
 * `StateObservables`.
 */
export type AnyParameterizedSelector = (s: State, argument: any) => any;

type _StateObservables<
  Selectors extends ScopedSelectors[keyof ScopedSelectors],
> = {
  [k in keyof Selectors as `${k &
    string}$`]: Selectors[k] extends AnyParameteterlessSelector
    ? Observable<ReturnType<Selectors[k]>>
    : Selectors[k] extends AnyParameterizedSelector
    ? Observable<
        (parameter: Parameters<Selectors[k]>[1]) => ReturnType<Selectors[k]>
      >
    : never;
};
/**
 * The state observables a side effect receives, one per selector, keyed by
 * scope and then by the selector name with a `$` suffix. A parameterless
 * selector becomes an observable of its result; a parameterized one becomes an
 * observable of a function from its argument to its result.
 */
export type StateObservables<Selectors extends ScopedSelectors> = {
  [k in keyof Selectors]: _StateObservables<Selectors[k]>;
};

type _ActionObservables<
  ActionCreators extends ScopedActionCreators[keyof ScopedActionCreators],
> = {
  [k in keyof ActionCreators as `${k &
    string}$`]: ActionCreators[k] extends AnyFunction
    ? Observable<ReturnType<ActionCreators[k]>>
    : never;
};
/**
 * The action observables a side effect receives, one per action creator, keyed
 * by scope and then by the action creator name with a `$` suffix. Each emits
 * only the actions that action creator produces.
 */
export type ActionObservables<ActionCreators extends ScopedActionCreators> = {
  [k in keyof ActionCreators]: _ActionObservables<ActionCreators[k]>;
};

/**
 * A side effect: a function of the store's action observables, state
 * observables and dependencies that returns an observable of actions to
 * dispatch.
 *
 * @typeParam Selectors - the scoped selectors the side effect reads
 * @typeParam ActionCreators - the scoped action creators it observes and emits
 */
export type LaceSideEffect<
  Selectors extends ScopedSelectors,
  ActionCreators extends ScopedActionCreators,
> = (
  action: ActionObservables<ActionCreators>,
  state: StateObservables<Selectors>,
  dependencies: SideEffectDependencies &
    WithLaceContext<Selectors, ActionCreators>,
) => Observable<ActionType<ActionCreators>>;

/**
 * A `LaceSideEffect` over any selectors and action creators.
 */
export type AnyLaceSideEffect = LaceSideEffect<any, any>;

/**
 * A synchronous module initializer: receives the module init props and
 * dependencies and returns the initialized value `T`.
 */
export type LaceInitSync<T> = (
  props: Readonly<ModuleInitProps>,
  dependencies: Readonly<ModuleInitDependencies>,
) => T;

/**
 * A module initializer: receives the module init props and dependencies and
 * returns the initialized value `T`, directly or as a promise.
 */
export type LaceInit<T> = (
  props: Readonly<ModuleInitProps>,
  dependencies: Readonly<ModuleInitDependencies>,
  // this should probably be just <T> (no Promise),
  // because we are pre-loading some pieces of **all** modules in SW due to dynamic imports limitation
) => Promise<T> | T;

/**
 * `ModuleInitProps` whose `loadModules` only accepts keys for the addons in
 * `AvailableAddons`.
 */
export interface ContextualModuleInitProps<
  AvailableAddons extends LaceModuleAddonNames,
> extends Omit<ModuleInitProps, 'loadModules'> {
  loadModules: <K extends ContextualLoadableKey<AvailableAddons>>(
    key: K,
  ) => LoadResult<K>;
}

/**
 * A `LaceInit` that receives `ContextualModuleInitProps`, so it can only load
 * the addons in `AvailableAddons`.
 */
export type ContextualLaceInit<
  T,
  AvailableAddons extends LaceModuleAddonNames,
> = (
  props: Readonly<ContextualModuleInitProps<AvailableAddons>>,
  dependencies: Readonly<ModuleInitDependencies>,
) => Promise<T> | T;

/**
 * A lazy import of a module whose default export is `T`, such as
 * `() => import('./init')`.
 */
export type DynamicallyLoaded<T> = () => Promise<{ default: T }>;

/**
 * A lazy import whose default export is a `LaceInit` producing `T`.
 */
export type DynamicallyLoadedInit<T> = DynamicallyLoaded<LaceInit<T>>;
/**
 * A lazy import whose default export is a `ContextualLaceInit` producing `T`.
 */
export type ContextualDynamicallyLoadedInit<
  T,
  AvailableAddons extends LaceModuleAddonNames,
> = DynamicallyLoaded<ContextualLaceInit<T, AvailableAddons>>;

/**
 * The action creators and selectors a module's store contributes, available
 * without loading the store itself.
 */
export type LaceStoreContext<S extends object, A extends object> = {
  actions: A;
  selectors?: S;
};

/**
 * The redux-persist bookkeeping added to a persisted slice, without
 * `undefined`.
 */
export type NonUndefinedPersistedState = Exclude<_PersistedState, undefined>;
/**
 * A slice state `S` as stored by redux-persist, including its persistence
 * bookkeeping.
 */
export type PersistedState<S> = NonUndefinedPersistedState & S;
/**
 * The type of any property of `PersistedState` for slice state `S`.
 */
export type PersistedStateProperty<S> =
  PersistedState<S>[keyof PersistedState<S>];
/**
 * The redux-persist configuration for one slice of state `S`. The store
 * supplies the key and storage; the slice chooses what to persist with a
 * `whitelist` of its own keys.
 */
export type LacePersistConfig<S> = Omit<
  PersistConfig<
    PersistedState<S>,
    any,
    PersistedState<S>[keyof PersistedState<S>]
  >,
  'blacklist' | 'key' | 'storage' | 'whitelist'
> & {
  // always use whitelist instead of blacklist to reduce chance of
  // accidental sensitive data exposure in store
  whitelist?: Array<keyof S>;
};

/**
 * Persist configurations keyed by the root `State` slice they apply to. Slices
 * without an entry are not persisted.
 */
export type LacePersistConfigMap = Partial<{
  [k in keyof State]: LacePersistConfig<State[k]>;
}>;

/**
 * What a module's store initializer returns: the reducers, middleware, persist
 * configurations, preloaded state, side-effect dependencies and side effects
 * the module adds to the wallet store.
 */
export interface LaceModuleStoreInit {
  middleware?: Middleware[];
  reducers?: Partial<ReducersMapObject<State, Action>>;
  persistConfig?: LacePersistConfigMap;
  preloadedState?: Partial<State>;
  sideEffectDependencies?: Partial<SideEffectDependencies>;
  // Intentional 'any': can't infer side effect types if it circularly references the contract/module
  sideEffects?: LaceSideEffect<any, any>[];
}

/**
 * A list of addon names, each a key of `LaceAddons`.
 */
export type LaceModuleAddonNames = Array<keyof LaceAddons>;
/**
 * A list of side-effect dependency names, each a key of
 * `SideEffectDependencies`.
 */
export type SideEffectDependencyNames = Array<keyof SideEffectDependencies>;

// Base contract type that contains common properties shared by all contract types
type BaseContract<
  DependencySelectors extends ScopedSelectors = object,
  DependencyActionCreators extends ScopedActionCreators = object,
  DependencyAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
> = {
  /**
   * Requires modules that `implements` these contracts
   */
  dependsOn?: Contracts<
    DependencySelectors,
    DependencyActionCreators,
    DependencyAddons
  >;
  /**
   * How many modules that 'implements' this contract can be loaded
   */
  instance: 'at-least-one' | 'exactly-one' | 'zero-or-more';
  name: ContractName;
};

// Pure contract type definitions - each contains only their specific properties
/**
 * The part of a store contract specific to its type: the mixin that adds the
 * contract's shared store functionality to the modules implementing it.
 */
export type StoreContractType<
  MixinSelectors extends ScopedSelectors = object,
  MixinActionCreators extends ScopedActionCreators = object,
> = {
  contractType: 'store';
  /**
   * Base/shared functionality of this contract.
   * In case Contract is implemented by multiple modules, mixin is de-duplicated.
   */
  mixin: LaceModuleMixin<MixinSelectors, MixinActionCreators>;
};

/**
 * The part of an addon contract specific to its type: the addons the contract
 * provides and whether to preload them in the extension service worker.
 */
export type AddonContractType<
  ProvidesAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
> = {
  contractType: 'addon';
  /**
   * When true, addons provided by this contract will be preloaded
   * in the service worker during the install phase.
   */
  preloadInServiceWorker?: boolean;
  provides: {
    addons: ProvidesAddons;
  };
};

/**
 * The part of a side-effect dependency contract specific to its type.
 */
export type SideEffectDependencyContractType = {
  contractType: 'sideEffectDependency';
  // Empty for now - LW-13087 will add provides.sideEffectDependencies
};

/**
 * A contract for state: implementing modules share the contract's store mixin,
 * and dependent modules can use its selectors and action creators.
 */
export type StoreContract<
  MixinSelectors extends ScopedSelectors = object,
  MixinActionCreators extends ScopedActionCreators = object,
  DependencySelectors extends ScopedSelectors = object,
  DependencyActionCreators extends ScopedActionCreators = object,
  DependencyAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
> = BaseContract<
  DependencySelectors,
  DependencyActionCreators,
  DependencyAddons
> &
  StoreContractType<MixinSelectors, MixinActionCreators>;

/**
 * A contract for addons: implementing modules provide the named addons, which
 * other modules load through `loadModules`.
 */
export type AddonContract<
  ProvidesAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
  DependencySelectors extends ScopedSelectors = object,
  DependencyActionCreators extends ScopedActionCreators = object,
  DependencyAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
> = AddonContractType<ProvidesAddons> &
  BaseContract<DependencySelectors, DependencyActionCreators, DependencyAddons>;

/**
 * A contract for side-effect dependencies that implementing modules provide.
 */
export type SideEffectDependencyContract<
  DependencySelectors extends ScopedSelectors = object,
  DependencyActionCreators extends ScopedActionCreators = object,
  DependencyAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
> = BaseContract<
  DependencySelectors,
  DependencyActionCreators,
  DependencyAddons
> &
  SideEffectDependencyContractType;

/**
 * A contract between modules: a named interface that modules implement or
 * depend on, with the number of implementations it allows. It is a store, addon
 * or side-effect dependency contract.
 */
export type Contract<
  MixinSelectors extends ScopedSelectors = object,
  MixinActionCreators extends ScopedActionCreators = object,
  DependencySelectors extends ScopedSelectors = object,
  DependencyActionCreators extends ScopedActionCreators = object,
  ProvidesAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
  DependencyAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
> =
  | AddonContract<
      ProvidesAddons,
      DependencySelectors,
      DependencyActionCreators,
      DependencyAddons
    >
  | SideEffectDependencyContract<
      DependencySelectors,
      DependencyActionCreators,
      DependencyAddons
    >
  | StoreContract<
      MixinSelectors,
      MixinActionCreators,
      DependencySelectors,
      DependencyActionCreators,
      DependencyAddons
    >;

/**
 * A module's store: its action creators and selectors, plus a lazy loader for
 * the store initializer.
 */
export type LaceModuleStore<
  Selectors extends ScopedSelectors = object,
  ActionCreators extends ScopedActionCreators = object,
> = {
  context: LaceStoreContext<Selectors, ActionCreators>;
  load: DynamicallyLoadedInit<LaceModuleStoreInit>;
};

/**
 * A bundle of contracts, as a module lists in `implements` or `dependsOn`.
 */
export type Contracts<
  CombinedSelectors extends ScopedSelectors,
  CombinedActionCreators extends ScopedActionCreators,
  CombinedProvidesAddons extends LaceModuleAddonNames,
> = {
  contracts: Contract<
    Partial<CombinedSelectors>,
    Partial<CombinedActionCreators>,
    Partial<CombinedSelectors>,
    Partial<CombinedActionCreators>,
    CombinedProvidesAddons
  >[];
};

/**
 * The addons modules can provide, keyed by addon name. Each addon contract adds
 * its addons to this interface through module augmentation.
 */
export interface LaceAddons {}

// https://mercury.com/blog/creating-an-emptyobject-type-in-typescript
const emptySymbol = Symbol('EmptyObject');
/**
 * The marker key of the empty-object type used for a module without addons.
 */
export type EmptyObjectSymbol = typeof emptySymbol;
type EmptyObject = { [emptySymbol]?: never };
type MaybeEmptyObject<T> = keyof T extends never ? EmptyObject : T;

type DeepContextualLaceInitAddons<
  T,
  AvailableAddons extends LaceModuleAddonNames,
> = {
  [k in keyof T]: NonNullable<T[k]> extends DynamicallyLoadedInit<infer T>
    ? ContextualDynamicallyLoadedInit<T, AvailableAddons>
    : T[k] extends object
    ? DeepContextualLaceInitAddons<T[k], AvailableAddons>
    : T[k];
};
type ContextualLaceInitAddons<AvailableAddons extends LaceModuleAddonNames> =
  DeepContextualLaceInitAddons<LaceAddons, AvailableAddons>;

/**
 * A module: a named unit of wallet functionality that implements contracts,
 * depends on others, and may provide a store and addons. Pass modules to
 * `createLaceWallet` to compose a wallet.
 */
export interface LaceModule<
  Selectors extends ScopedSelectors = object,
  ActionCreators extends ScopedActionCreators = object,
  DependencySelectors extends ScopedSelectors = object,
  DependencyActionCreators extends ScopedActionCreators = object,
  ContractSelectors extends ScopedSelectors = object,
  ContractActionCreators extends ScopedActionCreators = object,
  ProvidesAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
  DependencyAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
> {
  readonly dependsOn?: Contracts<
    DependencySelectors,
    DependencyActionCreators,
    DependencyAddons
  >;
  readonly implements: Contracts<
    ContractSelectors,
    ContractActionCreators,
    ProvidesAddons
  >;
  readonly moduleName: ModuleName;
  readonly store?: LaceModuleStore<Selectors, ActionCreators>;
  readonly addons: MaybeEmptyObject<
    Pick<
      ContextualLaceInitAddons<DependencyAddons | ProvidesAddons>,
      ArrayType<ProvidesAddons> extends keyof LaceAddons
        ? ArrayType<ProvidesAddons>
        : never
    >
  >;
}

/**
 * A function that extends a module with a contract's shared store
 * functionality.
 */
export type LaceModuleMixin<
  MixinSelectors extends ScopedSelectors,
  MixinActionCreators extends ScopedActionCreators,
> = (laceModule: LaceModule) => LaceModule<MixinSelectors, MixinActionCreators>;

/**
 * Variants of a module keyed by the `App` they are built for. A module package
 * default-exports one of these.
 */
export type LaceModuleMap = Partial<Record<App, LaceModule>>;

/**
 * The parts of a `LaceModule` that the module loader loads by key: its store
 * and addons.
 */
export type ModuleExports<
  Selectors extends ScopedSelectors = object,
  ActionCreators extends ScopedActionCreators = object,
> = Omit<
  LaceModule<Selectors, ActionCreators>,
  'dependsOn' | 'feature' | 'implements' | 'moduleName'
>;

/**
 * The selectors available to code using contract `T`: its own mixin selectors
 * together with the selectors of the contracts it depends on.
 */
export type ContractSelectors<T> = [T] extends [
  Contract<
    infer MixinSelectors,
    infer _MixinActionCreators,
    infer DependencySelectors,
    infer _DependencyActionCreators
  >,
]
  ? DependencySelectors & MixinSelectors
  : never;

/**
 * The selectors available inside module `T`: those of its own store, of the
 * contracts it implements and of the contracts it depends on.
 */
export type ModuleSelectors<T> = T extends LaceModule<
  infer Selectors,
  infer _ActionCreators,
  infer DependencySelectors,
  infer _DependencyActionCreators,
  infer ContractSelectors,
  infer _ContractActionCreators
>
  ? ContractSelectors & DependencySelectors & Selectors
  : never;

/**
 * The combined selectors of a `Contracts` bundle (what `combineContracts`
 * returns). With `ModuleStoreSelectors`, an equivalent of
 * `ModuleSelectors<typeof module>` built from the module's parts: declaration
 * emit must serialize a `typeof module` reference as ONE node, which can
 * exceed the compiler's cap (TS7056) for large modules, while the contract
 * combos and store serialize as separate, smaller nodes.
 */
export type ContractsSelectors<T> = T extends Contracts<
  infer CombinedSelectors,
  infer _CombinedActionCreators,
  infer _CombinedProvidesAddons
>
  ? CombinedSelectors
  : never;

/** The selectors of a module's `LaceModuleStore`. See `ContractsSelectors`. */
export type ModuleStoreSelectors<T> = T extends LaceModuleStore<
  infer Selectors,
  infer _ActionCreators
>
  ? Selectors
  : never;

/**
 * The properties for creating a module loader: the modules to load and the
 * module init props other than `loadModules`.
 */
export interface CreateLoaderProps
  extends Omit<ModuleInitProps, 'loadModules'> {
  modules: LaceModule[];
}

type ContractsAddons<ContractsType> = ContractsType extends Contracts<
  any,
  any,
  infer CombinedProvidesAddons
>
  ? CombinedProvidesAddons
  : never;

/**
 * Extract addon names from a module's 'dependsOn' and 'implements' contracts
 */
export type ModuleAddons<
  ImplementsAddons extends Contracts<
    ScopedSelectors,
    ScopedActionCreators,
    LaceModuleAddonNames
  >,
  DependsOnAddons extends Contracts<
    ScopedSelectors,
    ScopedActionCreators,
    LaceModuleAddonNames
  > = Contracts<EmptyObject, EmptyObject, []>,
> = Array<
  | ArrayType<ContractsAddons<DependsOnAddons>>
  | ArrayType<ContractsAddons<ImplementsAddons>>
>;
