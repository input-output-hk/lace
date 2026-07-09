import { ContractName, inferContractContext } from '@lace-contract/module';

// Provides `isWalletActive$` as a side effect dependency.
// SideEffectDependencies: isWalletActive$
//
// Decoupled from `@lace-contract/app-lock` so that consumers (e.g. blockchain
// contracts that gate periodic side effects) do not transitively pull
// `@lace-contract/authentication-prompt` into their dependency graph. See ADR
// 25 for the gating rule and the original chain that motivated this split.
export const walletActiveStateDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('wallet-active-state-dependency'),
  instance: 'exactly-one',
});
