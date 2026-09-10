import './augmentations';

import {
  cardanoProviderStoreContract,
  cardanoProviderDependencyContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import { cryptoAddonContract } from '@lace-contract/crypto';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { vaultCeremonyStoreContract } from '@lace-contract/vault';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';
import '@lace-contract/feature';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

// Guest-only: the composite CardanoProvider that sources the host-owned subset
// (params/utxos/addresses/submit) from window.lace and runs the rest free
// against blockfrost. It is the sole implementor of both provider contracts in
// the guest, replacing cardano-provider-blockfrost there.
const guestModule = inferModuleContext({
  moduleName: ModuleName('cardano-host-pull'),
  dependsOn: combineContracts([
    cryptoAddonContract,
    networkStoreContract,
    vaultCeremonyStoreContract,
    viewsStoreContract,
    walletRepoStoreContract,
  ] as const),
  implements: combineContracts([
    cardanoProviderStoreContract,
    cardanoProviderDependencyContract,
    signerFactoryAddonContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'Cardano host-pull',
      description: 'Guest-side Cardano provider backed by the host data plane',
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

// Re-syncs the wallet-repo projection (the hydrator's trigger). This module's
// own `syncWalletsOnCeremonySettled` side effect dispatches it when a host
// create/import ceremony settles (`vault.ceremonySettled`).
export { syncWalletsRequested } from './store/slice';

export type Selectors = ModuleSelectors<typeof guestModule>;
export type ActionCreators = ModuleActionCreators<typeof guestModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
