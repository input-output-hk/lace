import { EMPTY } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createInitializeSideEffects,
  initializeSideEffects,
} from '../../../src/store/side-effects';

import type { SideEffect } from '../../../src';
import type { SerializedMidnightWallet } from '@lace-contract/midnight-context';
import type { ModuleInitProps } from '@lace-contract/module';
import type { CollectionStorage } from '@lace-contract/storage';

const spies = vi.hoisted(() => {
  const sideEffect = () => vi.fn(() => EMPTY);
  return {
    updateActivities: sideEffect(),
    loadActivityDetails: sideEffect(),
    deleteWallet: sideEffect(),
    clearWalletStateOnResync: sideEffect(),
    resetSyncState: sideEffect(),
    requestResyncWallet: sideEffect(),
    resyncWalletOnConfigChangeFromFeatureFlags: sideEffect(),
    autoDismissMidnightSyncFailureOnResume: sideEffect(),
    autoDismissMidnightSyncFailureOnSyncSuccess: sideEffect(),
    accountWalletWatcher: sideEffect(),
    migrateUnavailableProofServerSelection: sideEffect(),
    watchTeeAttestationProgress: sideEffect(),
    clearTeeAttestationProgressOnNewTx: sideEffect(),
    watchProofActivities: sideEffect(),
    dismissProofActivity: sideEffect(),
    watchMidnightAccount: vi.fn(),
  };
});

vi.mock('../../../src/store/side-effects/activities', () => ({
  updateActivities: spies.updateActivities,
  loadActivityDetails: spies.loadActivityDetails,
}));
vi.mock('../../../src/store/side-effects/resync', () => ({
  createDeleteWalletSideEffect: vi.fn(() => spies.deleteWallet),
  createClearWalletStateOnResync: vi.fn(() => spies.clearWalletStateOnResync),
  createResetSyncStateSideEffect: vi.fn(() => spies.resetSyncState),
  createHeadlessResetSyncStateSideEffect: vi.fn(() => spies.resetSyncState),
  requestResyncWallet: spies.requestResyncWallet,
  resyncWalletOnConfigChangeFromFeatureFlags:
    spies.resyncWalletOnConfigChangeFromFeatureFlags,
}));
vi.mock('../../../src/store/side-effects/sync-failure', () => ({
  autoDismissMidnightSyncFailureOnResume:
    spies.autoDismissMidnightSyncFailureOnResume,
  autoDismissMidnightSyncFailureOnSyncSuccess:
    spies.autoDismissMidnightSyncFailureOnSyncSuccess,
}));
vi.mock('../../../src/store/side-effects/proof-server-kill-switch', () => ({
  migrateUnavailableProofServerSelection:
    spies.migrateUnavailableProofServerSelection,
}));
vi.mock('../../../src/store/side-effects/tee-attestation-progress', () => ({
  watchTeeAttestationProgress: spies.watchTeeAttestationProgress,
  clearTeeAttestationProgressOnNewTx: spies.clearTeeAttestationProgressOnNewTx,
}));
vi.mock('../../../src/store/side-effects/proof-activities', () => ({
  watchProofActivities: spies.watchProofActivities,
  dismissProofActivity: spies.dismissProofActivity,
}));
vi.mock('../../../src/store/side-effects/watch', () => ({
  watchMidnightAccounts: vi.fn(() => spies.accountWalletWatcher),
  watchMidnightAccount: spies.watchMidnightAccount,
}));

const storage = {} as CollectionStorage<SerializedMidnightWallet>;
const createCollectionStorage = vi.fn(() => storage);
const actionObservables = {} as Parameters<SideEffect>[0];
const stateObservables = {} as Parameters<SideEffect>[1];
const dependencies = {
  createCollectionStorage,
  logger: dummyLogger,
} as unknown as Parameters<SideEffect>[2];

const runInit = (init: typeof initializeSideEffects) => {
  const [sideEffect] = init({} as ModuleInitProps, { logger: dummyLogger });
  sideEffect(actionObservables, stateObservables, dependencies).subscribe();
};

describe('midnight-sync side-effect composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keys the persisted wallet state by account id', async () => {
    runInit(initializeSideEffects);

    expect(createCollectionStorage).toHaveBeenCalledTimes(1);
    const [{ collectionId, computeDocId }] = vi.mocked(createCollectionStorage)
      .mock.calls[0] as unknown as [
      {
        collectionId: string;
        computeDocId: (wallet: SerializedMidnightWallet) => string;
      },
    ];
    expect(collectionId).toBe('midnightWalletState');
    expect(
      computeDocId({ accountId: 'account-1' } as SerializedMidnightWallet),
    ).toBe('account-1');
  });

  it('runs the engine side effects over the shared storage', async () => {
    const resync = await import('../../../src/store/side-effects/resync');
    const watch = await import('../../../src/store/side-effects/watch');

    runInit(initializeSideEffects);

    expect(resync.createDeleteWalletSideEffect).toHaveBeenCalledWith(storage);
    expect(resync.createClearWalletStateOnResync).toHaveBeenCalledWith(storage);
    expect(watch.watchMidnightAccounts).toHaveBeenCalledWith(
      storage,
      spies.watchMidnightAccount,
    );
    for (const sideEffect of [
      spies.updateActivities,
      spies.loadActivityDetails,
      spies.deleteWallet,
      spies.clearWalletStateOnResync,
      spies.requestResyncWallet,
      spies.autoDismissMidnightSyncFailureOnResume,
      spies.autoDismissMidnightSyncFailureOnSyncSuccess,
      spies.accountWalletWatcher,
    ]) {
      expect(sideEffect).toHaveBeenCalledWith(
        actionObservables,
        stateObservables,
        dependencies,
      );
    }
  });

  it('adds the app-shell side effects in the module init', async () => {
    const resync = await import('../../../src/store/side-effects/resync');

    runInit(initializeSideEffects);

    expect(resync.createResetSyncStateSideEffect).toHaveBeenCalledWith(storage);
    expect(
      resync.createHeadlessResetSyncStateSideEffect,
    ).not.toHaveBeenCalled();
    expect(spies.resetSyncState).toHaveBeenCalledOnce();
    for (const sideEffect of [
      spies.resyncWalletOnConfigChangeFromFeatureFlags,
      spies.migrateUnavailableProofServerSelection,
      spies.watchProofActivities,
      spies.dismissProofActivity,
      spies.watchTeeAttestationProgress,
      spies.clearTeeAttestationProgressOnNewTx,
    ]) {
      expect(sideEffect).toHaveBeenCalledOnce();
    }
  });

  it('runs a loadout’s side effects instead of the app-shell ones', async () => {
    const resync = await import('../../../src/store/side-effects/resync');
    const loadoutSideEffect = vi.fn(() => EMPTY);
    const loadout = vi.fn(() => [loadoutSideEffect]);

    runInit(createInitializeSideEffects(loadout));

    expect(loadout).toHaveBeenCalledWith(storage);
    expect(loadoutSideEffect).toHaveBeenCalledWith(
      actionObservables,
      stateObservables,
      dependencies,
    );
    expect(resync.createResetSyncStateSideEffect).not.toHaveBeenCalled();
    for (const sideEffect of [
      spies.resyncWalletOnConfigChangeFromFeatureFlags,
      spies.migrateUnavailableProofServerSelection,
      spies.watchProofActivities,
      spies.dismissProofActivity,
      spies.watchTeeAttestationProgress,
      spies.clearTeeAttestationProgressOnNewTx,
    ]) {
      expect(sideEffect).not.toHaveBeenCalled();
    }
    expect(spies.accountWalletWatcher).toHaveBeenCalledOnce();
  });
});
