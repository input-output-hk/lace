import { ContractName, inferContractContext } from '@lace-contract/module';

// eslint-disable-next-line unicorn/prevent-abbreviations
export const devContract = inferContractContext({
  name: ContractName('dev'),
  contractType: 'sideEffectDependency',
  instance: 'at-least-one',
});
