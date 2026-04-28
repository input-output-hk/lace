import { ContractName, inferContractContext } from '@lace-contract/module';

// Provides internationalization and translation capabilities
// SideEffectDependencies: I18nProvider (t - translation function)
export const i18nDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('i18n-dependency'),
  instance: 'exactly-one',
});
