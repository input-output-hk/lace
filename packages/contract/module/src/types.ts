/* eslint-disable @typescript-eslint/no-explicit-any */
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

export type App = 'lace-extension' | 'lace-mobile' | 'lace-sdk';
export interface AppConfig {}

export type LacePlatform = 'android' | 'ios' | 'web-extension' | 'web';

export interface Runtime {
  app: App;
  config: AppConfig;
  env: Environment;
  platform: LacePlatform;
}

export interface State {}
export interface Action extends ReduxAction {}

export interface ModuleInitProps {
  loadModules: ModuleLoader;
  runtime: Runtime;
  /**
   * undefined for service worker
   */
  viewId?: ViewId;
}

export type ModuleInitDependencies = WithLogger;

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
  };

export interface SideEffectDependencies extends DefaultSideEffectDependencies {}

export type WithLaceContext<Selectors = unknown, ActionCreators = unknown> = {
  actions: ActionCreators;
  selectors: Selectors;
};
export type LaceReduxObservableEpic = Epic<
  Action,
  Action,
  State,
  SideEffectDependencies & WithLaceContext
>;

export type ArrayType<T> = T extends Array<infer A> ? A : never;
export type AnyFunction = (...args: any[]) => any;
type ActionName = string;
type AnyActionCreators = Partial<
  Record<ActionName, (...args: any[]) => ReduxAction>
>;
export type ScopedActionCreators = Partial<Record<Scope, AnyActionCreators>>;
type Scope = string;
type SelectorName = string;
// Using `any` for `argument` here to allow selectors with 0 or 1 param (state, [arg])
// we don’t care about the type of `arg` here – the real constraint is enforced at the hook site
// Since linter rule for no-explicit-any was turned off, I think this is ok.
export type ScopedSelectors = Partial<
  Record<
    Scope,
    Partial<Record<SelectorName, (state: State, argument?: any) => unknown>>
  >
>;

export type Values<T> = T[keyof T];
type OmitNever<T> = Pick<
  T,
  Values<{
    [Property in keyof T]: [T[Property]] extends [never] ? never : Property;
  }>
>;
export type OmitEmptyActionCreators<T> = OmitNever<{
  [k in keyof T]: T[k] extends AnyFunction ? T[k] : never;
}>;

type _ReturnTypes<T> = Values<{
  [k in keyof T]: T[k] extends AnyFunction ? ReturnType<T[k]> : never;
}>;
type ReturnTypes<U> = U extends any ? _ReturnTypes<U> : never;
export type ActionType<ActionCreators> = ReturnTypes<Values<ActionCreators>>;

export type AnyParameteterlessSelector = (s: State, argument: undefined) => any;
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
export type ActionObservables<ActionCreators extends ScopedActionCreators> = {
  [k in keyof ActionCreators]: _ActionObservables<ActionCreators[k]>;
};

export type LaceSideEffect<
  Selectors extends ScopedSelectors,
  ActionCreators extends ScopedActionCreators,
> = (
  action: ActionObservables<ActionCreators>,
  state: StateObservables<Selectors>,
  dependencies: SideEffectDependencies &
    WithLaceContext<Selectors, ActionCreators>,
) => Observable<ActionType<ActionCreators>>;

export type AnyLaceSideEffect = LaceSideEffect<any, any>;

export type LaceInitSync<T> = (
  props: Readonly<ModuleInitProps>,
  dependencies: Readonly<ModuleInitDependencies>,
) => T;

export type LaceInit<T> = (
  props: Readonly<ModuleInitProps>,
  dependencies: Readonly<ModuleInitDependencies>,
  // this should probably be just <T> (no Promise),
  // because we are pre-loading some pieces of **all** modules in SW due to dynamic imports limitation
) => Promise<T> | T;

// Contextual version of ModuleInitProps that restricts loadModules to available addons
export interface ContextualModuleInitProps<
  AvailableAddons extends LaceModuleAddonNames,
> extends Omit<ModuleInitProps, 'loadModules'> {
  loadModules: <K extends ContextualLoadableKey<AvailableAddons>>(
    key: K,
  ) => LoadResult<K>;
}

// Contextual version of LaceInit that uses restricted ModuleInitProps
export type ContextualLaceInit<
  T,
  AvailableAddons extends LaceModuleAddonNames,
> = (
  props: Readonly<ContextualModuleInitProps<AvailableAddons>>,
  dependencies: Readonly<ModuleInitDependencies>,
) => Promise<T> | T;

export type DynamicallyLoaded<T> = () => Promise<{ default: T }>;

export type DynamicallyLoadedInit<T> = DynamicallyLoaded<LaceInit<T>>;
export type ContextualDynamicallyLoadedInit<
  T,
  AvailableAddons extends LaceModuleAddonNames,
> = DynamicallyLoaded<ContextualLaceInit<T, AvailableAddons>>;

export type LaceStoreContext<S extends object, A extends object> = {
  actions: A;
  selectors?: S;
};

export type NonUndefinedPersistedState = Exclude<_PersistedState, undefined>;
export type PersistedState<S> = NonUndefinedPersistedState & S;
export type PersistedStateProperty<S> =
  PersistedState<S>[keyof PersistedState<S>];
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

export type LacePersistConfigMap = Partial<{
  [k in keyof State]: LacePersistConfig<State[k]>;
}>;

export interface LaceModuleStoreInit {
  middleware?: Middleware[];
  reducers?: Partial<ReducersMapObject<State, Action>>;
  persistConfig?: LacePersistConfigMap;
  preloadedState?: Partial<State>;
  sideEffectDependencies?: Partial<SideEffectDependencies>;
  // Intentional 'any': can't infer side effect types if it circularly references the contract/module
  sideEffects?: LaceSideEffect<any, any>[];
}

export type LaceModuleAddonNames = Array<keyof LaceAddons>;
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

export type SideEffectDependencyContractType = {
  contractType: 'sideEffectDependency';
  // Empty for now - LW-13087 will add provides.sideEffectDependencies
};

// Composed contract types - BaseContract + specific type
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

export type AddonContract<
  ProvidesAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
  DependencySelectors extends ScopedSelectors = object,
  DependencyActionCreators extends ScopedActionCreators = object,
  DependencyAddons extends LaceModuleAddonNames = LaceModuleAddonNames,
> = AddonContractType<ProvidesAddons> &
  BaseContract<DependencySelectors, DependencyActionCreators, DependencyAddons>;

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

// Contract union type with the new type system
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

export type LaceModuleStore<
  Selectors extends ScopedSelectors = object,
  ActionCreators extends ScopedActionCreators = object,
> = {
  context: LaceStoreContext<Selectors, ActionCreators>;
  load: DynamicallyLoadedInit<LaceModuleStoreInit>;
};

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

export interface LaceAddons {}

// https://mercury.com/blog/creating-an-emptyobject-type-in-typescript
const emptySymbol = Symbol('EmptyObject');
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

export type LaceModuleMixin<
  MixinSelectors extends ScopedSelectors,
  MixinActionCreators extends ScopedActionCreators,
> = (laceModule: LaceModule) => LaceModule<MixinSelectors, MixinActionCreators>;

export type LaceModuleMap = Partial<Record<App, LaceModule>>;

export type ModuleExports<
  Selectors extends ScopedSelectors = object,
  ActionCreators extends ScopedActionCreators = object,
> = Omit<
  LaceModule<Selectors, ActionCreators>,
  'dependsOn' | 'feature' | 'implements' | 'moduleName'
>;

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
