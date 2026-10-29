import { ContractName, inferContractContext } from '@lace-contract/module';

/**
 * Engine access for code outside the store, such as the SDK's Midnight
 * helpers. Implemented by the headless Midnight engine module only.
 */
export const midnightEngineAddonContract = inferContractContext({
  name: ContractName('midnight-engine-addon'),
  instance: 'exactly-one',
  contractType: 'addon',
  provides: {
    addons: ['loadMidnightEngine'],
  },
});
