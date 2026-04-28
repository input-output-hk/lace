import { ContractName, inferContractContext } from '@lace-contract/module';

// Provides persistent storage capabilities through platform-specific implementations
// SideEffectDependencies: StorageDependencies (createCollectionStorage, createDocumentStorage)
export const storageDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('storage-dependency'),
  instance: 'exactly-one',
});
