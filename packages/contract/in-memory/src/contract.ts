import { ContractName, inferContractContext } from '@lace-contract/module';
import './types';

export const inMemoryIntegrationAddonContract = inferContractContext({
  name: ContractName('in-memory-integration-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadInMemoryWalletIntegration'],
  },
});
