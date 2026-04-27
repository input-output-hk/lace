import { ContractName, inferContractContext } from '@lace-contract/module';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const cryptoAddonContract = inferContractContext({
  name: ContractName('crypto-addon'),
  instance: 'exactly-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['bip32Ed25519', 'blake2b'],
  },
});

export type Selectors = ContractSelectors<typeof cryptoAddonContract>;
export type ActionCreators = ContractActionCreators<typeof cryptoAddonContract>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
