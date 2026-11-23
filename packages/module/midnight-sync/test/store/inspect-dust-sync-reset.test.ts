import {
  SerialisedWalletState,
  UnreadableDustSnapshotError,
} from '@lace-contract/midnight-context';
import { Option } from 'effect';
import { firstValueFrom, of, throwError, NEVER } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { inspectDustSyncReset } from '../../src/store/inspect-dust-sync-reset';

import type {
  MidnightWalletsByAccountId,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';
import type { AccountId } from '@lace-contract/wallet-repo';

vi.mock('@midnightntwrk/wallet-sdk/dust/v2', () => ({
  coreStateOf: (dust: unknown) => Option.fromNullable(dust),
}));
vi.mock('@midnightntwrk/wallet-sdk/dust/v1', () => ({
  coreStateOf: () => Option.none(),
}));
vi.mock('../../src/store/dust-sync', () => ({
  getPendingDustNullifiersForReset: (snapshot: string) =>
    JSON.parse(snapshot) as string[],
}));
const id = 'one' as AccountId;
const other = 'two' as AccountId;
const saved = (
  accountId: AccountId,
  pending: string[],
  networkId = 'preview',
) =>
  ({
    accountId,
    networkId,
    serializedState: { dust: SerialisedWalletState(JSON.stringify(pending)) },
  } as SerializedMidnightWallet);
const storage = (documents: SerializedMidnightWallet[]) =>
  ({
    getAll: () => of(documents),
  } as Pick<CollectionStorage<SerializedMidnightWallet>, 'getAll'>);
const live = (accountId: AccountId, pending: string[], networkId = 'preview') =>
  ({
    [accountId]: {
      accountId,
      networkId,
      state: () =>
        of({
          dust: {
            syncKind: 'projections',
            pendingDust: pending.map(nullifier => ({ nullifier })),
          },
        }),
    },
  } as unknown as MidnightWalletsByAccountId);

describe('pending Dust inspection', () => {
  it('includes saved wallets and new live reservations, deduplicates and isolates the network', async () => {
    const result = await firstValueFrom(
      inspectDustSyncReset('preview', [id, other], {
        storage: storage([
          saved(id, ['1']),
          saved(other, ['2']),
          saved('elsewhere' as AccountId, ['3'], 'preprod'),
        ]),
        wallets$: of({
          ...live(id, ['1', '4']),
          ...live('elsewhere' as AccountId, ['5'], 'preprod'),
        }),
      }),
    );
    expect(result).toEqual({ one: ['1', '4'], two: ['2'] });
  });
  it('returns empty only when inspected wallets have no pending reservations', async () => {
    expect(
      await firstValueFrom(
        inspectDustSyncReset('preview', [id], {
          storage: storage([]),
          wallets$: of(live(id, [])),
        }),
      ),
    ).toEqual({});
  });
  it('does not treat a missing wallet or unreadable saved state as empty', async () => {
    await expect(
      firstValueFrom(
        inspectDustSyncReset('preview', [id], {
          storage: storage([]),
          wallets$: of({}),
        }),
      ),
    ).rejects.toThrow('not ready');
    const broken = saved(id, []);
    broken.serializedState.dust = SerialisedWalletState('invalid');
    await expect(
      firstValueFrom(
        inspectDustSyncReset('preview', [id], {
          storage: storage([broken]),
          wallets$: of({}),
        }),
      ),
    ).rejects.toMatchObject({
      name: 'UnreadableDustSnapshotError',
      accountId: id,
      cause: expect.any(SyntaxError) as unknown,
    });
    expect(broken.serializedState.dust).toBe(SerialisedWalletState('invalid'));
  });
  it('identifies the unreadable sibling without authorizing the network reset', async () => {
    const broken = saved(other, []);
    broken.serializedState.dust = SerialisedWalletState('invalid');
    await expect(
      firstValueFrom(
        inspectDustSyncReset('preview', [id, other], {
          storage: storage([saved(id, ['pending']), broken]),
          wallets$: of(live(id, ['pending'])),
        }),
      ),
    ).rejects.toMatchObject({
      name: UnreadableDustSnapshotError.name,
      accountId: other,
    });
  });
  it('propagates storage and live inspection failures', async () => {
    const brokenStorage = {
      getAll: () => throwError(() => new Error('storage unavailable')),
    } as Pick<CollectionStorage<SerializedMidnightWallet>, 'getAll'>;
    await expect(
      firstValueFrom(
        inspectDustSyncReset('preview', [id], {
          storage: brokenStorage,
          wallets$: of({}),
        }),
      ),
    ).rejects.toThrow('storage unavailable');
    const wallets = live(id, []);
    wallets[id].state = () => throwError(() => new Error('wallet unavailable'));
    await expect(
      firstValueFrom(
        inspectDustSyncReset('preview', [id], {
          storage: storage([]),
          wallets$: of(wallets),
        }),
      ),
    ).rejects.toThrow('wallet unavailable');
  });
  it('bounds a silent live wallet check', async () => {
    vi.useFakeTimers();
    try {
      const wallets = live(id, []);
      wallets[id].state = () => NEVER;
      const result = expect(
        firstValueFrom(
          inspectDustSyncReset('preview', [id], {
            storage: storage([]),
            wallets$: of(wallets),
          }),
        ),
      ).rejects.toThrow('Timeout');
      await vi.runAllTimersAsync();
      await result;
    } finally {
      vi.useRealTimers();
    }
  });
});
