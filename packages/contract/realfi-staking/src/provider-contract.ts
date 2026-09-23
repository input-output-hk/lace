import { ContractName, inferContractContext } from '@lace-contract/module';

// SideEffectDependencies: realfiProvider (getSorQuote, buildBundledTx,
// getExchangeRateAndApy, …)
export const realfiProviderDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('realfi-provider-dependency'),
  instance: 'zero-or-more',
});
