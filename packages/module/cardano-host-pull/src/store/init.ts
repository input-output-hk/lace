import { initializeDependencies } from './dependencies';
import { navigateHomeOnFirstWallet } from './side-effects/navigate-home-on-first-wallet';
import { pullPendingTxs } from './side-effects/pull-pending-txs';
import { pushActiveNetwork } from './side-effects/push-active-network';
import { showWalletAddedSheet } from './side-effects/show-wallet-added-sheet';
import { syncWalletsOnCeremonySettled } from './side-effects/sync-wallets-on-ceremony-settled';
import { hydrateWalletRepo } from './side-effects/wallet-repo-hydrator';
import { cardanoHostPullReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  reducers: cardanoHostPullReducers,
  sideEffects: [
    hydrateWalletRepo,
    navigateHomeOnFirstWallet,
    showWalletAddedSheet,
    syncWalletsOnCeremonySettled,
    pushActiveNetwork,
    pullPendingTxs,
  ],
  sideEffectDependencies: await initializeDependencies(props, dependencies),
});

export default redux;
