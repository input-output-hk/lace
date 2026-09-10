import './augmentations';

import {
  BITCOIN_FEATURE_FLAG,
  bitcoinProviderContract,
} from '@lace-contract/bitcoin-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

// Guest-only: the composite BitcoinProvider that sources the host-owned subset
// (utxos/submit) from window.lace and runs the six free-running reads against
// maestro. It is the sole implementor of bitcoinProviderContract in the guest,
// replacing bitcoin-provider-maestro there, and provides the host signer
// factory (ADR 46). Depends only on wallet-repo — the address → account
// resolver reads the Bitcoin accounts the cardano-host-pull hydrator projects.
const guestModule = inferModuleContext({
  moduleName: ModuleName('bitcoin-host-pull'),
  dependsOn: combineContracts([walletRepoStoreContract] as const),
  implements: combineContracts([
    bitcoinProviderContract,
    signerFactoryAddonContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === BITCOIN_FEATURE_FLAG),
    metadata: {
      name: 'Bitcoin host-pull',
      description: 'Guest-side Bitcoin provider backed by the host data plane',
    },
  },
  addons: {
    loadSignerFactory: async () =>
      import('./exposed-modules/host-signer-factory'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof guestModule>;
export type ActionCreators = ModuleActionCreators<typeof guestModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
