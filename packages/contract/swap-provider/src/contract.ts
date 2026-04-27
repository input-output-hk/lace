import { ContractName, inferContractContext } from '@lace-contract/module';

// SideEffectDependencies: swapProvider (getQuote, buildSwapTx, listTokens, listDexes, searchTokens)
export const swapProviderDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('swap-provider-dependency'),
  instance: 'zero-or-more',
});
