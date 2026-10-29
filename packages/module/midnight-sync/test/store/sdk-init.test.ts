import { registerMidnightBlockchainNetworks } from '@lace-contract/midnight-context';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { createSdkStoreInit } from '../../src/store/sdk-init';
import * as sideEffects from '../../src/store/side-effects';
import * as resync from '../../src/store/side-effects/resync';

import type { SideEffect } from '../../src';
import type { SerializedMidnightWallet } from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';

const headlessReset = vi.hoisted(() => () => undefined);

vi.mock('../../src/store/side-effects', () => ({
  createInitializeSideEffects: vi.fn(() => () => []),
}));
vi.mock('../../src/store/side-effects/resync', () => ({
  createResetSyncStateSideEffect: vi.fn(),
  createHeadlessResetSyncStateSideEffect: vi.fn(
    () => headlessReset as unknown as SideEffect,
  ),
}));

describe('createSdkStoreInit', () => {
  it('runs the headless reset-sync side effect, not the reloading one', () => {
    createSdkStoreInit({
      auth: { authenticate: () => of(true), accessAuthSecret: vi.fn() },
    });

    const [[loadout]] = vi.mocked(sideEffects.createInitializeSideEffects).mock
      .calls;
    const storage = {} as CollectionStorage<SerializedMidnightWallet>;
    const loadoutSideEffects = loadout(storage);

    expect(resync.createHeadlessResetSyncStateSideEffect).toHaveBeenCalledWith(
      storage,
    );
    expect(resync.createResetSyncStateSideEffect).not.toHaveBeenCalled();
    expect(loadoutSideEffects).toContain(headlessReset);
    expect(loadoutSideEffects).toContain(registerMidnightBlockchainNetworks);
  });
});
