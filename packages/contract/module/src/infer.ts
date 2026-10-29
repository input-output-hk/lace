/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ArrayType,
  Contract,
  Contracts,
  LaceModule,
  LaceModuleAddonNames,
  LaceModuleStore,
} from './types';

/**
 * Declares a module. It returns the module unchanged, with the types of its
 * contracts, store and addons inferred from it, so a wallet that loads it is
 * typed from them.
 */
export const inferModuleContext = <
  Selectors extends object = object,
  ActionCreators extends object = object,
  DependencySelectors extends object = object,
  DependencyActionCreators extends object = object,
  ContractSelectors extends object = object,
  ContractActionCreators extends object = object,
  ProvidesAddons extends LaceModuleAddonNames = [],
  DependencyAddons extends LaceModuleAddonNames = [],
>(
  laceModule: LaceModule<
    Selectors,
    ActionCreators,
    DependencySelectors,
    DependencyActionCreators,
    ContractSelectors,
    ContractActionCreators,
    ProvidesAddons,
    DependencyAddons
  >,
) => laceModule;

/**
 * Declares a contract. It returns the contract unchanged, with the types of
 * its selectors, action creators and addons inferred from it, so the modules
 * implementing or depending on it are typed from them.
 */
export const inferContractContext = <
  Selectors extends object = object,
  ActionCreators extends object = object,
  DependencySelectors extends object = object,
  DependencyActionCreators extends object = object,
  ProvidesAddons extends LaceModuleAddonNames = [],
  DependencyAddons extends LaceModuleAddonNames = [],
>(
  contract: Contract<
    Selectors,
    ActionCreators,
    DependencySelectors,
    DependencyActionCreators,
    ProvidesAddons,
    DependencyAddons
  >,
) => contract;

type CombineContractSelectors<
  Contracts,
  Selectors = object,
> = Contracts extends readonly [
  Contract<infer MixinSelectors, infer _, infer DependencySelectors>,
  ...infer Rest,
]
  ? CombineContractSelectors<
      Rest,
      DependencySelectors & MixinSelectors & Selectors
    >
  : Selectors;

type CombineContractActionCreators<
  Contracts,
  ActionCreators = object,
> = Contracts extends readonly [
  Contract<
    infer _,
    infer MixinActionCreators,
    infer __,
    infer DependencyActionCreators
  >,
  ...infer Rest,
]
  ? CombineContractActionCreators<
      Rest,
      ActionCreators & DependencyActionCreators & MixinActionCreators
    >
  : ActionCreators;

type CombineContractProvidesAddons<
  Contracts,
  Accumulator = [],
> = Contracts extends readonly [
  Contract<any, any, any, any, infer ProvidesAddons>,
  ...infer Rest,
]
  ? CombineContractProvidesAddons<
      Rest,
      Array<ArrayType<Accumulator> | ArrayType<ProvidesAddons>>
    >
  : Accumulator;

/**
 * Combines contracts into the set a module implements or depends on, typed
 * with the selectors, action creators and addons of them all. Pass the array
 * `as const` to keep each contract's types.
 */
export const combineContracts = <T extends Contract[]>(
  contracts: T,
): Contracts<
  CombineContractSelectors<T>,
  CombineContractActionCreators<T>,
  CombineContractProvidesAddons<T>
> => ({
  // not sure why this force cast is required
  // this might be the cause of some type incompatibility issue
  contracts: contracts as unknown as Contracts<
    CombineContractSelectors<T>,
    CombineContractActionCreators<T>,
    CombineContractProvidesAddons<T>
  >['contracts'],
});

/** The action creators a contract provides: its mixin's and those of the contracts it depends on. */
export type ContractActionCreators<T> = [T] extends [
  Contract<
    infer _MixinSelectors,
    infer MixinActionCreators,
    infer _DependencySelectors,
    infer DependencyActionCreators
  >,
]
  ? DependencyActionCreators & MixinActionCreators
  : never;

/** The action creators available to a module: its own store's, its contracts' and its dependencies'. */
export type ModuleActionCreators<T> = T extends LaceModule<
  infer _Selectors,
  infer ActionCreators,
  infer _DependencySelectors,
  infer DependencyActionCreators,
  infer _ContractSelectors,
  infer ContractActionCreators
>
  ? ActionCreators & ContractActionCreators & DependencyActionCreators
  : never;

/** The combined action creators of a `Contracts` bundle. The action-creators
 * counterpart of `ContractsSelectors` — see it for when to prefer these
 * part-wise extractors over `ModuleActionCreators<typeof module>`. */
export type ContractsActionCreators<T> = T extends Contracts<
  infer _CombinedSelectors,
  infer CombinedActionCreators,
  infer _CombinedProvidesAddons
>
  ? CombinedActionCreators
  : never;

/** The action creators of a module's `LaceModuleStore`. See `ContractsSelectors`. */
export type ModuleStoreActionCreators<T> = T extends LaceModuleStore<
  infer _Selectors,
  infer ActionCreators
>
  ? ActionCreators
  : never;

/**
 * Declares a module's store: its actions, selectors and the loader of its
 * reducers and side effects. It returns the store unchanged, with its
 * selector and action-creator types inferred from it.
 */
export const inferStoreContext = <
  Selectors extends object = object,
  ActionCreators extends object = object,
>(
  laceStore: LaceModuleStore<Selectors, ActionCreators>,
) => laceStore;
