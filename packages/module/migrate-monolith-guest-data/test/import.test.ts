import { addressBookActions, ContactId } from '@lace-contract/address-book';
import { analyticsActions } from '@lace-contract/analytics';
import { BlockchainNetworkId } from '@lace-contract/network';
import { FolderId, TokenId, tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import {
  clearMigratedMonolithGuestData,
  importMonolithGuestData,
} from '../src/store/side-effects/import';
import { migrateMonolithGuestDataActions } from '../src/store/slice';

import type { ActionCreators } from '../src';
import type { Address } from '@lace-contract/addresses';
import type { Folder } from '@lace-contract/tokens';
import type {
  LaceResult,
  MonolithGuestData,
  MonolithGuestDataDoneResult,
} from '@lace-lib/extension-shell-api';

// The import pulls and reports through INJECTED dependencies (ADR 19), never
// `window.lace` inline. Action creators are the REAL contract ones — the module
// dispatches into the addressBook / tokenFolders / analytics slices.

const actions = {
  addressBook: addressBookActions.addressBook,
  tokenFolders: tokensActions.tokenFolders,
  analytics: analyticsActions.analytics,
  migrateMonolithGuestData:
    migrateMonolithGuestDataActions.migrateMonolithGuestData,
} as unknown as Partial<ActionCreators>;

const { monolithGuestDataImported } =
  migrateMonolithGuestDataActions.migrateMonolithGuestData;

const EMPTY_PULL: MonolithGuestData = {
  addressBook: null,
  tokenFolders: null,
  analytics: null,
};

/** The address as the contact slice types it — the branded form the legacy
 * string maps onto. */
const CONTACT_ADDRESS = 'addr_test1qalice' as Address;

const LEGACY_CONTACT = {
  id: 'c-1',
  name: 'Alice',
  aliases: [],
  addresses: [
    {
      address: 'addr_test1qalice',
      blockchainName: 'Cardano',
      network: 'cardano-1',
    },
  ],
};

const fullPull: MonolithGuestData = {
  addressBook: { contacts: { 'c-1': LEGACY_CONTACT } },
  tokenFolders: {
    folders: [
      { id: 'f-2', name: 'Newer', accountId: 'w-1-0-1' },
      { id: 'f-1', name: 'Older', accountId: 'w-1-0-1' },
    ],
    tokenIdsByFolderId: { 'f-1': ['t-1'] },
  },
  analytics: { analytics: { user: { id: 'user-42' } } },
};

const ok = <T>(value: T): LaceResult<T> => ({ ok: true, value });
const wireError: LaceResult<never> = {
  ok: false,
  error: { code: 'internal', message: 'boom' },
};

type Emitted = { type: string; payload?: unknown };

const spyLogger = () => ({
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const NO_FOLDERS: Folder[] = [];

describe('importMonolithGuestData', () => {
  it('imports contacts, folders with their tokens, and the analytics user, then the marker last', () => {
    testSideEffect(importMonolithGuestData, ({ cold, flush }) => {
      const pullMonolithGuestData = vi.fn(() =>
        cold('(a|)', { a: ok(fullPull) }),
      );
      const emitted: Emitted[] = [];

      return {
        actionObservables: {},
        stateObservables: {
          tokenFolders: { selectAllFolders$: cold('(a|)', { a: NO_FOLDERS }) },
        },
        dependencies: {
          actions,
          canMigrateMonolithGuestData: true,
          pullMonolithGuestData,
          completeMonolithGuestDataMigration: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(pullMonolithGuestData).toHaveBeenCalledTimes(1);
          expect(emitted).toEqual([
            addressBookActions.addressBook.addContact({
              id: ContactId('c-1'),
              name: 'Alice',
              aliases: [],
              addresses: [
                {
                  address: CONTACT_ADDRESS,
                  blockchainName: 'Cardano',
                  network: BlockchainNetworkId('cardano-1'),
                },
              ],
            }),
            // Reversed: createFolder unshifts, so oldest-first replays the
            // legacy newest-first order.
            tokensActions.tokenFolders.createFolder({
              id: FolderId('f-1'),
              name: 'Older',
              accountId: 'w-1-0-1',
            }),
            tokensActions.tokenFolders.createFolder({
              id: FolderId('f-2'),
              name: 'Newer',
              accountId: 'w-1-0-1',
            }),
            tokensActions.tokenFolders.addTokensToFolder({
              folderId: FolderId('f-1'),
              tokenIds: [TokenId('t-1')],
            }),
            analyticsActions.analytics.load({ id: 'user-42' }),
            monolithGuestDataImported(),
          ]);
        },
      };
    });
  });

  it('skips a folder already in the store — a re-run whose report never landed must not duplicate it', () => {
    testSideEffect(importMonolithGuestData, ({ cold, flush }) => {
      const emitted: Emitted[] = [];
      const existing: Folder[] = [
        { id: FolderId('f-1'), name: 'Older', accountId: 'w-1-0-1' },
      ];

      return {
        actionObservables: {},
        stateObservables: {
          tokenFolders: { selectAllFolders$: cold('(a|)', { a: existing }) },
        },
        dependencies: {
          actions,
          canMigrateMonolithGuestData: true,
          pullMonolithGuestData: vi.fn(() =>
            cold('(a|)', {
              a: ok({ ...EMPTY_PULL, tokenFolders: fullPull.tokenFolders }),
            }),
          ),
          completeMonolithGuestDataMigration: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(emitted).toEqual([
            tokensActions.tokenFolders.createFolder({
              id: FolderId('f-2'),
              name: 'Newer',
              accountId: 'w-1-0-1',
            }),
            // The assignment still replays — addTokensToFolder de-duplicates.
            tokensActions.tokenFolders.addTokensToFolder({
              folderId: FolderId('f-1'),
              tokenIds: [TokenId('t-1')],
            }),
            monolithGuestDataImported(),
          ]);
        },
      };
    });
  });

  it('imports no analytics user for a profile that recorded none — an opted-out user stays out', () => {
    testSideEffect(importMonolithGuestData, ({ cold, flush }) => {
      const emitted: Emitted[] = [];

      return {
        actionObservables: {},
        stateObservables: {
          tokenFolders: { selectAllFolders$: cold('(a|)', { a: NO_FOLDERS }) },
        },
        dependencies: {
          actions,
          canMigrateMonolithGuestData: true,
          pullMonolithGuestData: vi.fn(() =>
            cold('(a|)', {
              a: ok({
                addressBook: { contacts: { 'c-1': LEGACY_CONTACT } },
                tokenFolders: null,
                analytics: { analytics: {} },
              }),
            }),
          ),
          completeMonolithGuestDataMigration: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(
            emitted.some(action => action.type.startsWith('analytics/')),
          ).toBe(false);
          expect(emitted.at(-1)).toEqual(monolithGuestDataImported());
        },
      };
    });
  });

  it('emits nothing at all for an empty pull — no import, and no marker to trigger the report', () => {
    testSideEffect(importMonolithGuestData, ({ cold, flush }) => {
      const emitted: Emitted[] = [];

      return {
        actionObservables: {},
        stateObservables: {
          tokenFolders: { selectAllFolders$: cold('(a|)', { a: NO_FOLDERS }) },
        },
        dependencies: {
          actions,
          canMigrateMonolithGuestData: true,
          pullMonolithGuestData: vi.fn(() =>
            cold('(a|)', { a: ok(EMPTY_PULL) }),
          ),
          completeMonolithGuestDataMigration: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(emitted).toEqual([]);
        },
      };
    });
  });

  it('marks a PRESENT but empty slice as imported — its legacy key still needs clearing', () => {
    testSideEffect(importMonolithGuestData, ({ cold, flush }) => {
      const emitted: Emitted[] = [];

      return {
        actionObservables: {},
        stateObservables: {
          tokenFolders: { selectAllFolders$: cold('(a|)', { a: NO_FOLDERS }) },
        },
        dependencies: {
          actions,
          canMigrateMonolithGuestData: true,
          pullMonolithGuestData: vi.fn(() =>
            cold('(a|)', { a: ok({ ...EMPTY_PULL, addressBook: {} }) }),
          ),
          completeMonolithGuestDataMigration: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(emitted).toEqual([monolithGuestDataImported()]);
        },
      };
    });
  });

  it('emits nothing on a failed pull — the legacy keys stay put for the next boot', () => {
    testSideEffect(importMonolithGuestData, ({ cold, flush }) => {
      const emitted: Emitted[] = [];

      return {
        actionObservables: {},
        stateObservables: {
          tokenFolders: { selectAllFolders$: cold('(a|)', { a: NO_FOLDERS }) },
        },
        dependencies: {
          actions,
          canMigrateMonolithGuestData: true,
          pullMonolithGuestData: vi.fn(() => cold('(a|)', { a: wireError })),
          completeMonolithGuestDataMigration: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(emitted).toEqual([]);
        },
      };
    });
  });

  it('is a silent no-op against a host that does not advertise the pair', () => {
    testSideEffect(importMonolithGuestData, ({ cold, flush }) => {
      const pullMonolithGuestData = vi.fn();
      const emitted: Emitted[] = [];

      return {
        actionObservables: {},
        stateObservables: {
          tokenFolders: { selectAllFolders$: cold('(a|)', { a: NO_FOLDERS }) },
        },
        dependencies: {
          actions,
          canMigrateMonolithGuestData: false,
          pullMonolithGuestData,
          completeMonolithGuestDataMigration: vi.fn(),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(pullMonolithGuestData).not.toHaveBeenCalled();
          expect(emitted).toEqual([]);
        },
      };
    });
  });
});

describe('clearMigratedMonolithGuestData', () => {
  const done = ok<MonolithGuestDataDoneResult>({ cleared: true });

  it('flushes the persisted state BEFORE reporting, and emits nothing itself', () => {
    testSideEffect(clearMigratedMonolithGuestData, ({ cold, flush }) => {
      const order: string[] = [];
      const flushPersistedState = vi.fn(() => {
        order.push('flush');
        return cold('(a|)', { a: undefined });
      });
      const completeMonolithGuestDataMigration = vi.fn(() => {
        order.push('report');
        return cold('(a|)', { a: done });
      });
      const emitted: Emitted[] = [];

      return {
        actionObservables: {
          migrateMonolithGuestData: {
            monolithGuestDataImported$: cold('-a', {
              a: monolithGuestDataImported(),
            }),
          },
        },
        dependencies: {
          actions,
          completeMonolithGuestDataMigration,
          flushPersistedState,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => emitted.push(action as Emitted));
          flush();

          expect(order).toEqual(['flush', 'report']);
          expect(emitted).toEqual([]);
        },
      };
    });
  });

  it('does NOT report when the flush fails — the import may still be queued, and the legacy keys are its only other copy', () => {
    testSideEffect(clearMigratedMonolithGuestData, ({ cold, flush }) => {
      const completeMonolithGuestDataMigration = vi.fn();
      const logger = spyLogger();

      return {
        actionObservables: {
          migrateMonolithGuestData: {
            monolithGuestDataImported$: cold('-a', {
              a: monolithGuestDataImported(),
            }),
          },
        },
        dependencies: {
          actions,
          completeMonolithGuestDataMigration,
          flushPersistedState: vi.fn(() => cold<void>('-#')),
          logger,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();

          expect(completeMonolithGuestDataMigration).not.toHaveBeenCalled();
          expect(logger.error).toHaveBeenCalledTimes(1);
        },
      };
    });
  });

  it('logs a failed report and stays subscribed — the next boot re-imports and retries', () => {
    testSideEffect(clearMigratedMonolithGuestData, ({ cold, flush }) => {
      const logger = spyLogger();
      const completeMonolithGuestDataMigration = vi.fn(() =>
        cold('(a|)', { a: wireError }),
      );

      return {
        actionObservables: {
          migrateMonolithGuestData: {
            monolithGuestDataImported$: cold('-a-b', {
              a: monolithGuestDataImported(),
              b: monolithGuestDataImported(),
            }),
          },
        },
        dependencies: {
          actions,
          completeMonolithGuestDataMigration,
          flushPersistedState: vi.fn(() => cold('(a|)', { a: undefined })),
          logger,
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();

          expect(logger.warn).toHaveBeenCalledTimes(2);
          expect(completeMonolithGuestDataMigration).toHaveBeenCalledTimes(2);
        },
      };
    });
  });
});
