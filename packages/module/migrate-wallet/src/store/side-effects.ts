import { makeConsumePoolSelection } from './side-effects/consume-pool-selection';
import { makeMarkSourceMigrated } from './side-effects/mark-source-migrated';
import { makeNavigateHomeOnCancel } from './side-effects/navigate-home-on-cancel';
import { makeResolveDestinationTargets } from './side-effects/resolve-destination-targets';
import { makeRunDelegation } from './side-effects/run-delegation';
import { makeRunDiscovery } from './side-effects/run-discovery';
import { makeRunSweep } from './side-effects/run-sweep';
import { makeTrackAnalytics } from './side-effects/track-analytics';
import { makeTrackUndelegatedFinish } from './side-effects/track-undelegated-finish';
import { makeTrackWalletCreation } from './side-effects/track-wallet-creation';

import type { SideEffect } from '..';
import type { LaceInit } from '@lace-contract/module';

export {
  makeConsumePoolSelection,
  makeMarkSourceMigrated,
  makeNavigateHomeOnCancel,
  makeResolveDestinationTargets,
  makeTrackWalletCreation,
  makeRunDiscovery,
  makeRunSweep,
  makeRunDelegation,
  makeTrackAnalytics,
  makeTrackUndelegatedFinish,
};
export type {
  ReviewedSweepPlan,
  SourceContext,
  SourceContextResolver,
} from './side-effects/create-source-context';

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  // Cardano is the only blockchain this wizard migrates, so the first (Cardano)
  // builder is the one the delegation step submits.
  const [makeBuildEarnRewardsTx] = await loadModules(
    'addons.loadEarnRewardsTxBuilder',
  );

  return [
    makeTrackWalletCreation(),
    makeRunDiscovery(),
    makeRunSweep(),
    makeRunDelegation({ makeBuildEarnRewardsTx }),
    makeResolveDestinationTargets(),
    makeConsumePoolSelection(),
    makeTrackAnalytics(),
    makeTrackUndelegatedFinish(),
    makeNavigateHomeOnCancel(),
    makeMarkSourceMigrated(),
  ];
};
