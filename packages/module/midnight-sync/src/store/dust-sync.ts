import { makeIndexerChainVersionProbe } from '@midnightntwrk/wallet-sdk/capabilities';
import {
  CustomForkingDustWallet,
  DustWallet,
  dustVariantConfigurations,
} from '@midnightntwrk/wallet-sdk/dust';
import { V1Builder } from '@midnightntwrk/wallet-sdk/dust/v1';
import {
  Serialization,
  SyncService,
  V2Builder,
} from '@midnightntwrk/wallet-sdk/dust/v2';
import { Effect, Either } from 'effect';

import type { MidnightNetworkConfig } from '@lace-contract/midnight-context';
import type { DefaultDustConfiguration } from '@midnightntwrk/wallet-sdk/dust';

const isFilteredDustSyncEnabled = (network: MidnightNetworkConfig) =>
  network.isFilteredDustSyncRolloutEnabled &&
  network.filteredDustSyncIndexer === network.indexerAddress;

export const createDustWallet = (
  configuration: DefaultDustConfiguration,
  network: MidnightNetworkConfig,
  fresh: boolean,
) => {
  if (!isFilteredDustSyncEnabled(network)) {
    return DustWallet({ ...configuration, skipLedgerV8DustHistory: fresh });
  }
  const { v1, v2, migration } = dustVariantConfigurations(configuration);
  return CustomForkingDustWallet(
    {
      ...configuration,
      chainVersionProbe: makeIndexerChainVersionProbe(configuration),
      ...(fresh
        ? {
            dustTimelineStartProbe: async () =>
              Effect.runPromise(
                SyncService.findDustTimelineStart(v2, configuration.forks.v9),
              ),
          }
        : {}),
    },
    { builder: new V1Builder().withDefaults(), configuration: v1 },
    {
      builder: new V2Builder()
        .withDefaults()
        .withSync(
          SyncService.makeEventLessSyncService,
          SyncService.makeEventLessSyncCapability,
        )
        .withStartAuxDefaults()
        .withMigration(migration),
      configuration: v2,
    },
  );
};

/** Refuse a lossy mode change instead of treating a valid snapshot as corrupt. */
export const resolveDustRestoreMode = (
  snapshot: string,
  {
    network,
    authorizedPendingDustNullifiers = [],
  }: {
    network: MidnightNetworkConfig;
    authorizedPendingDustNullifiers?: readonly string[];
  },
): 'rebuild' | 'restore' => {
  if (isFilteredDustSyncEnabled(network)) return 'restore';
  let metadata: unknown;
  try {
    metadata = JSON.parse(snapshot);
  } catch {
    return 'restore';
  }
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    !('syncKind' in metadata) ||
    metadata.syncKind !== 'projections'
  )
    return 'restore';
  // Only a settings save that disables filtering authorizes a rebuild. Losing
  // the rollout flag or changing endpoints must retain the completed snapshot.
  if (
    network.filteredDustSyncIndexer ||
    network.dustSyncResetAuthorizations === undefined
  )
    throw new Error(
      'Filtered Dust sync is unavailable for this indexer. Saved wallet data has been retained. Restore the previous settings or explicitly disable Faster Dust sync.',
    );
  const wallet = Either.getOrThrowWith(
    Serialization.makeDefaultV2SerializationCapability().deserialize(
      null,
      snapshot,
    ),
    error => error,
  );
  if (
    wallet.pendingDust.some(
      ({ nullifier }) =>
        !authorizedPendingDustNullifiers.includes(String(nullifier)),
    )
  ) {
    throw new Error(
      'Cannot change Dust sync mode while Dust spends are pending. Restore the previous setting and let transactions settle first. Saved wallet data has been retained.',
    );
  }
  return 'rebuild';
};

/** Inspect only projection snapshots: full-sync snapshots do not need a reset. */
export const getPendingDustNullifiersForReset = (
  snapshot: string,
): string[] => {
  const metadata: unknown = JSON.parse(snapshot);
  if (!metadata || typeof metadata !== 'object')
    throw new Error('Cannot inspect Dust snapshot');
  if (!('syncKind' in metadata) || metadata.syncKind !== 'projections')
    return [];
  const wallet = Either.getOrThrowWith(
    Serialization.makeDefaultV2SerializationCapability().deserialize(
      null,
      snapshot,
    ),
    error => error,
  );
  return wallet.pendingDust.map(({ nullifier }) => String(nullifier));
};
