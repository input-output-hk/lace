import { ContractName, inferContractContext } from '@lace-contract/module';

/**
 * The contract a storage module implements: it gives every module's side
 * effects `createDocumentStorage` and `createCollectionStorage`, backed by
 * the platform's storage. A wallet loads one storage module; with two,
 * `createLaceWallet` fails with `MultipleImplementationsError`.
 */
export const storageDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('storage-dependency'),
  instance: 'exactly-one',
});
