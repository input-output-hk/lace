import { initializeMidnightDependencies } from './dependencies';
import { pushActiveNetwork } from './side-effects/push-active-network';
import { resetSyncState } from './side-effects/reset-sync-state';
import { watchMidnightWallets } from './side-effects/watch';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [watchMidnightWallets, pushActiveNetwork, resetSyncState],
  sideEffectDependencies: initializeMidnightDependencies(),
});

export default redux;
