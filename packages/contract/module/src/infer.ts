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
 * Infer generic parameters in a way that preserves type safety
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

/**
 * Infer generic parameters in a way that preserves type safety
 */
export const inferStoreContext = <
  Selectors extends object = object,
  ActionCreators extends object = object,
>(
  laceStore: LaceModuleStore<Selectors, ActionCreators>,
) => laceStore;
