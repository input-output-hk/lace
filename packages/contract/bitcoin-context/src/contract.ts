import {
  type ActionType,
  type ContractActionCreators,
  ContractName,
  type ContractSelectors,
  inferContractContext,
  type LaceSideEffect,
} from '@lace-contract/module';

export const bitcoinProviderContract = inferContractContext({
  name: ContractName('bitcoin-provider'),
  instance: 'exactly-one',
  contractType: 'sideEffectDependency',
});

export const bitcoinFeeMarketProvider = inferContractContext({
  name: ContractName('bitcoin-fee-market-provider'),
  instance: 'exactly-one',
  contractType: 'sideEffectDependency',
});

export type Selectors = ContractSelectors<typeof bitcoinProviderContract>;

export type ActionCreators = ContractActionCreators<
  typeof bitcoinProviderContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type Action = ActionType<ActionCreators>;
